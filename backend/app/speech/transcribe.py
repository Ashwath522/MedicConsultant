"""Speech-to-text with faster-whisper (free, runs locally, audio never leaves the machine).

Model size is set by WHISPER_MODEL in .env:
  tiny / base  → fast, lower accuracy (good for quick testing)
  small        → default, good balance on a MacBook
  medium       → better for mixed Kannada/Hindi/English, slower
The model downloads once on first use (~250 MB for "small").
"""
from functools import lru_cache

from app.core.config import settings


@lru_cache(maxsize=1)
def _model():
    from faster_whisper import WhisperModel  # imported lazily so tests/app start fast

    return WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")


def transcribe(path: str, language: str | None = None) -> dict:
    """Returns {"language": "en", "duration": 123.4, "segments": [{"start", "end", "text"}]}.

    language=None lets Whisper auto-detect (best for code-mixed speech).
    """
    segments, info = _model().transcribe(
        path,
        language=language,
        vad_filter=True,  # skip silences
        beam_size=5,
    )
    out = [
        {"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
        for s in segments
        if s.text.strip()
    ]
    return {"language": info.language, "duration": round(info.duration, 2), "segments": out}
