// hooks/useCatalog.ts
import { useCallback, useState } from "react"
import { VideoService } from "../services/videoService"
import type { AITaskOption, AIModelOption } from "../types"
import { chooseFirstModel, choosePreferredTask } from "../utils/helpers"

export function useCatalog() {
  const [tasks, setTasks] = useState<AITaskOption[]>([])
  const [models, setModels] = useState<AIModelOption[]>([])
  const [uploadTask, setUploadTask] = useState("object_detection")
  const [uploadModelPath, setUploadModelPath] = useState("")

  const fetchCatalog = useCallback(async () => {
    try {
      const { tasks, models } = await VideoService.getModelCatalog()
      setTasks(tasks)
      setModels(models)
      const defaultTask = choosePreferredTask(tasks)
      setUploadTask(defaultTask)
      setUploadModelPath(chooseFirstModel(models, defaultTask))
    } catch (error) {
      console.error(error)
    }
  }, [])

  const handleUploadTaskChange = useCallback((taskType: string) => {
    setUploadTask(taskType)
    setUploadModelPath(chooseFirstModel(models, taskType))
  }, [models])

  return {
    tasks,
    models,
    uploadTask,
    uploadModelPath,
    setUploadModelPath,
    fetchCatalog,
    handleUploadTaskChange,
  }
}