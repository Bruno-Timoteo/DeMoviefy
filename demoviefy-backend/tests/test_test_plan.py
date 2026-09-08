"""Automated acceptance tests derived from the official DeMoviefy test plan.

Tips:
* Run all scenarios from the repository root with ``.\\test.ps1 -All``.
* Run one scenario with ``.\\test.ps1 -Test CT03``.
* These tests validate HTTP contracts and workflow states. They deliberately do
  not run Whisper or YOLO, which keeps the suite fast and deterministic.
* When adding a scenario, use the CT identifier in the test name so it appears
  in the PowerShell menu and can be selected with ``-Test``.
"""

from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from app import create_app, db
from app.models.video import Video
from app.repositories.video_repository import create_video, update_status


# A stable catalog response is enough for controller tests; no real model file
# is required. Copy it with ``dict(AI_CONFIG)`` whenever it leaves the fixture
# so a test cannot accidentally mutate the shared baseline.
AI_CONFIG = {
    "task_type": "object_detection",
    "task_label": "Deteccao de objetos",
    "model_path": "tests/model.pt",
    "model_relative_path": "tests/model.pt",
    "model_name": "model.pt",
    "frame_stride": 8,
    "confidence_threshold": 0.35,
    "max_frames": 300,
    "clip_start_sec": 0.0,
    "clip_end_sec": None,
}


class FakeJobQueue:
    """Records queued work without creating worker threads in controller tests."""

    def __init__(self, queued_jobs):
        self.queued_jobs = queued_jobs

    def enqueue(self, video_id):
        job_id = f"job-{video_id}"
        self.queued_jobs.append((video_id, job_id))
        return job_id


class DeMoviefyTestPlan(unittest.TestCase):
    """Each test gets a clean SQLite database and a private temporary folder."""

    def setUp(self):
        self.temp_dir = TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.queued_jobs = []

        def allocate_video_path(filename):
            source = Path(filename)
            candidate = self.root / filename
            suffix = 1
            while candidate.exists():
                candidate = self.root / f"{source.stem}_{suffix}{source.suffix}"
                suffix += 1
            return candidate

        # Patch dependencies where the controller *uses* them, rather than at
        # their original module. This is the reliable unittest.mock pattern for
        # names imported with ``from module import name``.
        #
        # The queue is replaced by an in-memory recorder, so controller tests
        # prove scheduling without starting real workers or AI jobs.
        self.patches = [
                patch("app.controllers.video_controller.video_file_path", lambda name: self.root / name),
                patch("app.controllers.video_controller.analysis_file_path", lambda video_id: self.root / f"analysis-{video_id}.json"),
                patch("app.controllers.video_controller.annotated_video_path", lambda video_id: self.root / f"annotated-{video_id}.mp4"),
                patch("app.controllers.video_controller.transcription_file_path", lambda video_id: self.root / f"transcription-{video_id}.json"),
                patch("app.controllers.video_controller.ensure_storage_dirs", lambda: self.root.mkdir(exist_ok=True)),
                patch("app.controllers.video_controller.to_repo_relative", lambda path: str(path)),
                patch("app.controllers.video_controller.unique_video_file_path", allocate_video_path),
                patch("app.controllers.video_controller.resolve_ai_config", return_value={
                    "task_type": "object_detection",
                    "task_label": "Detecção de Objetos",
                    "model_path": "models/yolo.pt",
                    "model_relative_path": "models/yolo.pt",
                    "model_name": "YOLO",
                }),
                patch("app.controllers.video_controller.save_ai_config", lambda *_args, **_kwargs: dict(AI_CONFIG)),
                patch("app.controllers.video_controller.save_processing_state", lambda *_args, **_kwargs: None),
                patch("app.controllers.video_controller.load_ai_config", lambda _video_id: dict(AI_CONFIG)),
                patch("app.controllers.video_controller.load_processing_state", lambda _video_id: {
                    "processing_progress": 1,
                    "processing_stage": "queued",
                    "processing_eta_seconds": None,
                    "processing_message": "Na fila.",
                }),
                patch("app.controllers.video_controller.has_analysis", lambda _video_id: False),
                patch("app.controllers.video_controller.has_annotated_video", lambda _video_id: False),
                patch("app.controllers.video_controller.has_transcription", lambda _video_id: False),
                patch("app.controllers.video_controller.list_analysis_variants", lambda _video_id: []),
                patch("app.controllers.video_controller.get_job_queue", return_value=FakeJobQueue(self.queued_jobs)),
            ]


        for active_patch in self.patches:
            active_patch.start()

        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
        })
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            # SQLite keeps a file handle open on Windows until the engine is
            # disposed. Without this, TemporaryDirectory cleanup can fail.
            db.engine.dispose()
        for active_patch in reversed(self.patches):
            active_patch.stop()
        self.temp_dir.cleanup()

    def create_video(self, status="PROCESSADO"):
        """Create a database record for tests that start after upload."""
        with self.app.app_context():
            video = create_video(filename="video_teste.mp4")
            update_status(video, status)
            return video.id

    def upload(self, filename="video_teste.mp4", **fields):
        """Send a minimal in-memory multipart file to the real upload route."""
        fields["file"] = (BytesIO(b"test video"), filename)
        return self.client.post(
            "/videos",
            data=fields,
            content_type="multipart/form-data",
        )

    def test_ct01_accepts_supported_video_and_queues_processing(self):
        # The file bytes assertion protects against a false success response:
        # it confirms the upload route actually saved the selected file.
        response = self.upload()

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["video"]["status"], "PROCESSANDO")
        self.assertEqual(self.queued_jobs, [(payload["video"]["id"], payload["video"]["job_id"])])
        self.assertEqual((self.root / "video_teste.mp4").read_bytes(), b"test video")

    def test_ct02_rejects_unsupported_file_before_saving_or_processing(self):
        response = self.upload("documento.txt")

        self.assertEqual(response.status_code, 400)
        self.assertIn("Formato", response.get_json()["error"])
        self.assertFalse((self.root / "documento.txt").exists())
        self.assertEqual(self.queued_jobs, [])

    def test_ct03_returns_ready_transcription_for_clean_audio(self):
        # The transcription artifact is mocked at the storage boundary. Keep
        # model-quality/accuracy checks in a separate dataset evaluation suite.
        video_id = self.create_video()
        transcription = {
            "content": "Esta e uma transcricao clara.", "source": "whisper", "language": "pt",
            "segments": [{"id": 1, "start": 0, "end": 2, "text": "Esta e uma transcricao clara."}],
            "model_name": "base", "status": "ready", "error": None,
        }
        with patch("app.controllers.video_controller.load_transcription", return_value=transcription):
            response = self.client.get(f"/videos/{video_id}/transcription")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["available"])
        self.assertEqual(response.get_json()["transcription"]["content"], transcription["content"])

    def test_ct04_keeps_flow_available_when_low_quality_audio_has_gaps(self):
        # A placeholder such as [inaudivel] is acceptable here; CT04 requires
        # the result screen to remain usable, not perfect speech recognition.
        video_id = self.create_video()
        low_quality_result = {
            "content": "[inaudivel] precisamos sair", "source": "whisper", "language": "pt",
            "segments": [], "model_name": "base", "status": "ready", "error": None,
        }
        with patch("app.controllers.video_controller.load_transcription", return_value=low_quality_result):
            response = self.client.get(f"/videos/{video_id}/transcription")

        self.assertEqual(response.status_code, 200)
        self.assertIn("[inaudivel]", response.get_json()["transcription"]["content"])

    def test_ct05_returns_sensitive_content_category_and_critical_detection(self):
        # The timestamp is important: the frontend uses detections to point the
        # user to the critical excerpt, not only to show a category label.
        video_id = self.create_video()
        analysis = {"label_counts": {"violence": 1}, "top_labels": ["violence"], "detections": [{"label": "violence", "time_sec": 12.4}]}
        with patch("app.controllers.video_controller.load_analysis", return_value=analysis):
            response = self.client.get(f"/videos/{video_id}/analysis")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["analysis"]["top_labels"], ["violence"])
        self.assertEqual(response.get_json()["analysis"]["detections"][0]["time_sec"], 12.4)

    def test_ct06_does_not_expose_partial_artifacts_while_processing(self):
        # 202 is the API contract for pending data. A client should poll again
        # instead of treating this normal processing state as an error.
        video_id = self.create_video(status="PROCESSANDO_IA")
        with patch("app.controllers.video_controller.load_analysis", return_value=None), patch(
            "app.controllers.video_controller.load_transcription", return_value=None
        ):
            analysis_response = self.client.get(f"/videos/{video_id}/analysis")
            transcription_response = self.client.get(f"/videos/{video_id}/transcription")

        self.assertEqual(analysis_response.status_code, 202)
        self.assertFalse(analysis_response.get_json()["available"])
        self.assertEqual(transcription_response.status_code, 202)
        self.assertFalse(transcription_response.get_json()["available"])

    def test_ct07_rejects_manual_updates_to_ai_results(self):
        # Test both endpoints; protecting only the interface would still allow
        # a user to alter results by calling the API directly.
        video_id = self.create_video()

        analysis_response = self.client.put(f"/videos/{video_id}/analysis", json={"top_labels": ["other"]})
        transcription_response = self.client.put(f"/videos/{video_id}/transcription", json={"content": "alterado"})

        self.assertEqual(analysis_response.status_code, 405)
        self.assertEqual(transcription_response.status_code, 405)

    def test_ct08_accepts_multiple_uploads_and_queues_each_request(self):
        # This covers application-level queue initiation. Use a separate load
        # test against Nginx + Flask for true concurrent traffic validation.
        responses = [self.upload(f"video_{index}.mp4") for index in range(3)]

        self.assertEqual([response.status_code for response in responses], [200, 200, 200])
        self.assertEqual(len(self.queued_jobs), 3)
        self.assertEqual(len({video_id for video_id, _ in self.queued_jobs}), 3)

    def test_ct09_keeps_duplicate_filenames_in_separate_files(self):
        first_response = self.upload("same_name.mp4")
        second_response = self.upload("same_name.mp4")

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        first_payload = first_response.get_json()
        second_payload = second_response.get_json()

        self.assertNotEqual(
            first_payload["video"]["filename"],
            second_payload["video"]["filename"],
        )
        self.assertEqual(
            (self.root / first_payload["video"]["filename"]).read_bytes(),
            b"test video",
        )
        self.assertEqual(
            (self.root / second_payload["video"]["filename"]).read_bytes(),
            b"test video",
        )

    def test_sec01_sanitizes_traversal_filename(self):
        response = self.upload("../../outside.mp4")

        self.assertEqual(response.status_code, 200)
        stored_filename = response.get_json()["video"]["filename"]
        stored_path = self.root / stored_filename
        self.assertEqual(stored_path.parent, self.root)
        self.assertNotIn("..", Path(stored_filename).parts)
        self.assertTrue(stored_path.exists())
        self.assertFalse((self.root.parent / "outside.mp4").exists())

    def test_sec02_rejects_invalid_processing_parameters(self):
        invalid_requests = [
            ({"frame_stride": "0"}, "frame_stride precisa ser pelo menos 1."),
            ({"max_frames": "0"}, "max_frames precisa ser pelo menos 1."),
            ({"confidence_threshold": "2"}, "confidence_threshold precisa ficar entre 0 e 1."),
            ({"clip_start_sec": "-1"}, "O início do trecho não pode ser negativo."),
            ({"clip_start_sec": "10", "clip_end_sec": "5"}, "O fim do trecho precisa ser maior que o início."),
        ]

        for fields, expected_error in invalid_requests:
            with self.subTest(fields=fields):
                response = self.upload(**fields)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.get_json()["error"], expected_error)
                self.assertEqual(self.queued_jobs, [])

    def test_sec03_rejects_unknown_status_without_changing_video(self):
        video_id = self.create_video(status="PROCESSADO")

        response = self.client.patch(
            f"/videos/{video_id}",
            json={"status": "ADMIN"},
        )

        self.assertEqual(response.status_code, 400)
        with self.app.app_context():
            video = db.session.get(Video, video_id)
            self.assertEqual(video.status, "PROCESSADO")

    def test_sec04_returns_not_found_for_unknown_video(self):
        for endpoint in (
            "/videos/999999",
            "/videos/999999/file",
            "/videos/999999/analysis",
            "/videos/999999/transcription",
        ):
            with self.subTest(endpoint=endpoint):
                self.assertEqual(self.client.get(endpoint).status_code, 404)
