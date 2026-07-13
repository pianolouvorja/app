export type BootstrapPhase =
  | 'idle'
  | 'checking'
  | 'preparing'
  | 'fetching-config'
  | 'downloading'
  | 'extracting'
  | 'warming'
  | 'done'
  | 'error'

export type BootstrapStatus = {
  phase: BootstrapPhase
  progress: number
  isFirstBoot: boolean
  isVisible: boolean
  hasError: boolean
  statusKey: string
}
