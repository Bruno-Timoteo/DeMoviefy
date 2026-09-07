// src/pages/Dashboard/components/NewVideoPanel.tsx

import { useCallback, useEffect, useRef, useState } from "react";

import { useCatalogStore } from "src/core/stores/useAICatalogStore";
import { useUploadStore } from "src/core/stores/useUploadStore";
import { useUpload } from "src/pages/Dashboard/hooks/useUpload";

export function NewVideoPanel() {
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        tasks,
        models,
        uploadTask,
        uploadModelPath,
        handleUploadTaskChange,
        setUploadModelPath,
        fetchCatalog,
    } = useCatalogStore();

    useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    const {
        file,
        setFile,
        uploadFrameStride,
        setUploadFrameStride,
        uploadConfidenceThreshold,
        setUploadConfidenceThreshold,
        uploadMaxFrames,
        setUploadMaxFrames,
        uploadClipStart,
        setUploadClipStart,
        uploadClipEnd,
        setUploadClipEnd,
        handleUpload,
    } = useUpload();

    const uploading = useUploadStore((state) => state.uploading);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();

            setIsDragging(false);

            if (e.dataTransfer.files.length > 0) {
                setFile(e.dataTransfer.files[0]);
            }
        },
        [setFile]
    );

    const handleClick = () => fileInputRef.current?.click();

    const handleFileInputChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const filteredModels = uploadTask
        ? models.filter((model) => model.task_type === uploadTask)
        : [];

    return (
        <section className="flex flex-col gap-8">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                    Novo vídeo
                </h2>

                <p className="mt-2 text-base leading-7 text-neutral-500">
                    Envie um vídeo e escolha como ele será analisado.
                </p>
            </div>

            <div
                className={`flex min-h-48 cursor-pointer items-center justify-center border px-8 py-10 text-center transition ${isDragging
                    ? "border-blue-500 bg-blue-100"
                    : "border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100/70"
                    }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={handleClick}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        handleClick();
                    }
                }}
                role="button"
                tabIndex={0}
                aria-label="Arrastar vídeo ou clicar para selecionar"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                    aria-hidden="true"
                />

                {file ? (
                    <div className="flex flex-col items-center gap-2">
                        <span className="max-w-full break-all text-sm font-medium text-neutral-900">
                            {file.name}
                        </span>

                        <span className="text-sm text-blue-700">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                    </div>
                ) : (
                    <div>
                        <p className="font-medium text-neutral-900">
                            Arraste seu vídeo aqui
                        </p>

                        <p className="mt-2 text-sm text-blue-700">
                            ou clique para selecionar um arquivo
                        </p>
                    </div>
                )}
            </div>

            {file && (
                <div className="flex flex-col gap-8">
                    <div className="group border-t border-neutral-200 pt-8 transition-transform duration-200 hover:translate-x-1">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 h-5 w-1 shrink-0 bg-transparent transition-colors group-hover:bg-blue-600" />

                            <div>
                                <h3 className="text-base font-semibold text-neutral-900">
                                    Configuração
                                </h3>

                                <p className="mt-1 text-sm leading-6 text-neutral-500">
                                    Defina como o vídeo será processado.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-6 border border-blue-100 bg-blue-50/50 p-6 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="task-select"
                                    className="text-sm font-medium text-neutral-700"
                                >
                                    Tarefa IA
                                </label>

                                <select
                                    id="task-select"
                                    value={uploadTask}
                                    onChange={(e) => handleUploadTaskChange(e.target.value)}
                                    className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
                                >
                                    <option value="">Selecione uma tarefa</option>

                                    {tasks.map((task) => (
                                        <option key={task.task_type} value={task.task_type}>
                                            {task.task_label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {uploadTask && (
                                <div>
                                    <label
                                        htmlFor="model-select"
                                        className="text-sm font-medium text-neutral-700"
                                    >
                                        Modelo
                                    </label>

                                    <select
                                        id="model-select"
                                        value={uploadModelPath}
                                        onChange={(e) => setUploadModelPath(e.target.value)}
                                        className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
                                    >
                                        <option value="">Selecione um modelo</option>

                                        {filteredModels.map((model) => (
                                            <option key={model.id} value={model.relative_path}>
                                                {model.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="group border-t border-neutral-200 pt-8 transition-transform duration-200 hover:translate-x-1">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 h-5 w-1 shrink-0 bg-transparent transition-colors group-hover:bg-blue-600" />

                            <div>
                                <h3 className="text-base font-semibold text-neutral-900">
                                    Parâmetros
                                </h3>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-6 border border-neutral-200 bg-neutral-50 p-6 md:grid-cols-3">
                            <div>
                                <label
                                    htmlFor="stride"
                                    className="text-sm font-medium text-neutral-700"
                                >
                                    Stride
                                </label>

                                <input
                                    id="stride"
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={uploadFrameStride}
                                    onChange={(e) => setUploadFrameStride(e.target.value)}
                                    className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="confidence"
                                    className="text-sm font-medium text-neutral-700"
                                >
                                    Confiança
                                </label>

                                <input
                                    id="confidence"
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={uploadConfidenceThreshold}
                                    onChange={(e) =>
                                        setUploadConfidenceThreshold(e.target.value)
                                    }
                                    className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="maxframes"
                                    className="text-sm font-medium text-neutral-700"
                                >
                                    Max Frames
                                </label>

                                <input
                                    id="maxframes"
                                    type="number"
                                    min="1"
                                    max="600"
                                    value={uploadMaxFrames}
                                    onChange={(e) => setUploadMaxFrames(e.target.value)}
                                    className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="group border-t border-neutral-200 pt-8 transition-transform duration-200 hover:translate-x-1">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 h-5 w-1 shrink-0 bg-transparent transition-colors group-hover:bg-blue-600" />

                            <div>
                                <h3 className="text-base font-semibold text-neutral-900">
                                    Trecho do vídeo
                                </h3>

                                <p className="mt-1 text-sm leading-6 text-neutral-500">
                                    Opcionalmente, defina o intervalo que será analisado.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-6 border border-neutral-200 bg-neutral-50 p-6 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="clipstart"
                                    className="text-sm font-medium text-neutral-700"
                                >
                                    Começo (s)
                                </label>

                                <input
                                    id="clipstart"
                                    type="number"
                                    min="0"
                                    value={uploadClipStart}
                                    onChange={(e) => setUploadClipStart(e.target.value)}
                                    className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="clipend"
                                    className="text-sm font-medium text-neutral-700"
                                >
                                    Fim (s)
                                </label>

                                <input
                                    id="clipend"
                                    type="number"
                                    min="0"
                                    value={uploadClipEnd}
                                    onChange={(e) => setUploadClipEnd(e.target.value)}
                                    className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
                                    placeholder="Vídeo inteiro"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Enviar vídeo */}
                    <button
                        type="button"
                        onClick={() => {
                            window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                            });

                            handleUpload(uploadTask, uploadModelPath);


                        }}
                        disabled={uploading}
                        className="w-full cursor-pointer bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Enviar vídeo

                    </button>

                    {/* Remover vídeo */}

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);

                            window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                            });
                        }}
                        className="cursor-pointer text-sm font-medium text-neutral-500 transition-colors hover:text-red-600"
                    >
                        Cancelar envio
                    </button>

                </div>
            )
            }
        </section >
    );
}