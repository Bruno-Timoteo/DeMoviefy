from config.settings import DetectionSettings
from controllers.detection_controller import DetectionController
from core.logger import build_logger
from views.console_view import ConsoleView


def main() -> None:
    settings = DetectionSettings.default()
    logger = build_logger(settings.log_file)
    view = ConsoleView(logger)
    controller = DetectionController(settings=settings, view=view)
    controller.run()


if __name__ == "__main__":
    main()
