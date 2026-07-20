import { storeToRefs } from 'pinia'

import { useMediaStore } from '../stores/useMediaStore'
import type { MediaOpenParams, MediaOpenResult, MediaPlaybackMode } from '../types/media'

export function useMediaPlayer() {
  const store = useMediaStore()
  const {
    session,
    status,
    lastErrorKey,
    minimized,
    isProjecting,
    showPlaylist,
    closeConfirmOpen,
    slideIndex,
    currentTimeSec,
    durationSec,
    volume,
    resolvedSlideImageUrl,
    ondemandDownloadPercent,
    ondemandNoticeVisible,
    ondemandDownloadDone,
    hasSession,
    isPlaying,
    isPaused,
    hasAudio,
    hasInstrumental,
    playbackMode,
    currentSlide,
    previewSnippet,
    previewReference,
    progressRatio,
    slideProgressRatio,
    currentTimeLabel,
    durationLabel,
    slideCount,
  } = storeToRefs(store)

  async function openTrack(params: MediaOpenParams): Promise<MediaOpenResult> {
    return store.open(params)
  }

  async function switchMode(mode: MediaPlaybackMode): Promise<MediaOpenResult> {
    return store.switchMode(mode)
  }

  return {
    session,
    status,
    lastErrorKey,
    minimized,
    isProjecting,
    showPlaylist,
    closeConfirmOpen,
    slideIndex,
    currentTimeSec,
    durationSec,
    volume,
    resolvedSlideImageUrl,
    ondemandDownloadPercent,
    ondemandNoticeVisible,
    ondemandDownloadDone,
    hasSession,
    isPlaying,
    isPaused,
    hasAudio,
    hasInstrumental,
    playbackMode,
    currentSlide,
    previewSnippet,
    previewReference,
    progressRatio,
    slideProgressRatio,
    currentTimeLabel,
    durationLabel,
    slideCount,
    openTrack,
    play: store.play,
    pause: store.pause,
    togglePlay: store.togglePlay,
    seekTo: store.seekTo,
    seekRatio: store.seekRatio,
    goToSlide: store.goToSlide,
    nextSlide: store.nextSlide,
    previousSlide: store.previousSlide,
    setVolume: store.setVolume,
    minimize: store.minimize,
    maximize: store.maximize,
    togglePlaylist: store.togglePlaylist,
    setPlaylistOpen: store.setPlaylistOpen,
    requestClose: store.requestClose,
    cancelClose: store.cancelClose,
    switchMode,
    startProjection: store.startProjection,
    clearProjection: store.clearProjection,
    toggleProjection: store.toggleProjection,
    close: store.close,
    clearError: store.clearError,
    syncProjectionFlag: store.syncProjectionFlag,
  }
}
