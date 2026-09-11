export type BootstrapPhase =
  | 'idle'
  | 'checking'
  | 'preparing'
  | 'fetching-config'
  | 'downloading'
  | 'extracting'
  | 'syncing-covers'
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
