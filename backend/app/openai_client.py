import os
import time
import httpx


SYSTEM_PROMPT = (
    "You are an expert agricultural advisor for smallholder farmers in Luwero District, Uganda. "
    "Give practical, simple, season-specific (First/Second), soil-specific (Loam/Clay/Sandy) advice "
    "in easy English. Mention weather, pests, and market tips when relevant."
)


class OpenAIError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


_CACHE: dict[str, tuple[float, str]] = {}
_CACHE_TTL_SECONDS = 300


def _env_float(name: str, default: float) -> float:
    value = (os.getenv(name) or "").strip()
    if not value:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    value = (os.getenv(name) or "").strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _cache_get(key: str) -> str | None:
    item = _CACHE.get(key)
    if not item:
        return None
    ts, value = item
    if time.time() - ts > _CACHE_TTL_SECONDS:
        _CACHE.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: str) -> None:
    _CACHE[key] = (time.time(), value)


async def chat_with_openai(message: str, cache_key: str | None = None) -> str:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise OpenAIError(500, "Missing OPENAI_API_KEY on server.")

    model = (os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()
    temperature = _env_float("OPENAI_TEMPERATURE", 0.7)
    max_tokens = _env_int("OPENAI_MAX_TOKENS", 400)

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    if cache_key:
        cached = _cache_get(cache_key)
        if cached:
            return cached

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers=headers,
            )
    except httpx.RequestError as e:
        raise OpenAIError(502, f"OpenAI request failed: {e}")

    if resp.status_code >= 400:
        detail = resp.text
        try:
            data = resp.json()
            detail = data.get("error", {}).get("message") or detail
        except ValueError:
            pass
        raise OpenAIError(resp.status_code, detail)

    data = resp.json()
    try:
        answer = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError):
        raise OpenAIError(502, "Unexpected response from OpenAI.")
    if cache_key:
        _cache_set(cache_key, answer)
    return answer
