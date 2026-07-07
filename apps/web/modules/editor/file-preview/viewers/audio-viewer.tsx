"use client";

import { Button } from "@baseblocks/ui/button";
import { Slider } from "@baseblocks/ui/slider";
import {
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useReducer, useRef } from "react";
import type { ViewerProps } from "../types";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface AudioViewerState {
  currentTime: number;
  duration: number;
  isMuted: boolean;
  isPlaying: boolean;
  volume: number;
}

type AudioViewerAction = {
  type: "update";
  value: Partial<AudioViewerState>;
};

function audioViewerReducer(
  state: AudioViewerState,
  action: AudioViewerAction,
): AudioViewerState {
  switch (action.type) {
    case "update":
      return { ...state, ...action.value };
    default:
      return state;
  }
}

export function AudioViewer({ file }: ViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, dispatch] = useReducer(audioViewerReducer, {
    currentTime: 0,
    duration: 0,
    isMuted: false,
    isPlaying: false,
    volume: 1,
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () =>
      dispatch({ type: "update", value: { currentTime: audio.currentTime } });
    const handleDurationChange = () =>
      dispatch({ type: "update", value: { duration: audio.duration } });
    const handlePlay = () =>
      dispatch({ type: "update", value: { isPlaying: true } });
    const handlePause = () =>
      dispatch({ type: "update", value: { isPlaying: false } });
    const handleEnded = () =>
      dispatch({ type: "update", value: { isPlaying: false } });

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || !value[0]) return;
    audio.currentTime = value[0];
    dispatch({ type: "update", value: { currentTime: value[0] } });
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || value[0] === undefined) return;
    audio.volume = value[0];
    dispatch({
      type: "update",
      value: { isMuted: value[0] === 0, volume: value[0] },
    });
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    dispatch({ type: "update", value: { isMuted: audio.muted } });
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(
      0,
      Math.min(state.duration, audio.currentTime + seconds),
    );
  };

  return (
    <div className="flex flex-col h-full items-center justify-center p-8 bg-gradient-to-b from-muted/50 to-muted">
      <audio ref={audioRef} src={file.url}>
        <track
          kind="captions"
          srcLang="en"
          label="Captions"
          src="data:text/vtt,WEBVTT"
        />
      </audio>

      {/* Album art placeholder */}
      <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8 shadow-lg">
        <Music className="h-16 w-16 text-primary/50" />
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm mb-4">
        <Slider
          value={[state.currentTime]}
          max={state.duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(-10)}
          title="Skip back 10s"
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        <Button
          variant="default"
          size="lg"
          className="rounded-full h-14 w-14"
          onClick={togglePlay}
          title={state.isPlaying ? "Pause" : "Play"}
        >
          {state.isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(10)}
          title="Skip forward 10s"
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 mt-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          title={state.isMuted ? "Unmute" : "Mute"}
        >
          {state.isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        <Slider
          value={[state.isMuted ? 0 : state.volume]}
          max={1}
          step={0.1}
          onValueChange={handleVolumeChange}
          className="w-28"
        />
      </div>
    </div>
  );
}
