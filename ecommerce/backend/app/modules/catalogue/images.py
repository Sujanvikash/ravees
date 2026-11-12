"""Turning an uploaded photo into the two WebP sizes the shop serves."""

import io
from dataclasses import dataclass

from PIL import Image as Pil
from PIL import ImageOps, UnidentifiedImageError

from app.core.errors import InvalidInput

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
LARGE, CARD = 1600, 600
THUMB = 200  # the emails' square product photos (shown at about 60px, sharp on 3x screens)
# a photo bigger than this many pixels is refused before it is decoded (a "decompression bomb")
Pil.MAX_IMAGE_PIXELS = 60_000_000


@dataclass(frozen=True, slots=True)
class Processed:
    large: bytes
    card: bytes
    width: int
    height: int


def _webp(picture: Pil.Image, box: int, quality: int) -> bytes:
    copy = picture.copy()
    copy.thumbnail((box, box), Pil.Resampling.LANCZOS)
    out = io.BytesIO()
    copy.save(out, 'WEBP', quality=quality, method=6)
    return out.getvalue()


def email_thumb(card: bytes, box: int = THUMB) -> bytes:
    """A photo's card size as a square JPEG on white (centre-cropped), for emails: not every mail app shows WebP,
    and a square crop keeps an email's product rows even without object-fit."""
    with Pil.open(io.BytesIO(card)) as source:
        picture = source.convert('RGBA')
    white = Pil.new('RGB', picture.size, (255, 255, 255))
    white.paste(picture, mask=picture.getchannel('A'))
    out = io.BytesIO()
    ImageOps.fit(white, (box, box), Pil.Resampling.LANCZOS).save(out, 'JPEG', quality=85, optimize=True)
    return out.getvalue()


def process(data: bytes) -> Processed:
    """The photo turned upright (by its camera tag), with its transparency kept, at both sizes."""
    if not data:
        raise InvalidInput('That file is empty.')
    if len(data) > MAX_UPLOAD_BYTES:
        raise InvalidInput('That photo is over 15 MB. Save it smaller and try again.')
    try:
        with Pil.open(io.BytesIO(data)) as source:
            if source.format not in {'JPEG', 'PNG', 'WEBP'}:
                raise InvalidInput('Upload a JPEG, PNG or WebP photo.')
            picture = ImageOps.exif_transpose(source)
            picture = picture.convert('RGBA' if 'A' in picture.getbands() or 'transparency' in source.info else 'RGB')
    except (UnidentifiedImageError, Pil.DecompressionBombError, OSError) as error:
        raise InvalidInput('That file isn’t a photo we can read. Upload a JPEG, PNG or WebP.') from error
    large = _webp(picture, LARGE, 82)
    card = _webp(picture, CARD, 80)
    width, height = picture.size
    scale = min(1, LARGE / max(width, height))
    return Processed(large=large, card=card, width=round(width * scale), height=round(height * scale))
