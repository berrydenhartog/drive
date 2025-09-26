"""Utils for WOPI"""

import re
from urllib.parse import quote_plus, urlencode, urlparse

from django.conf import settings
from django.core.cache import cache

from core import models
from wopi.tasks.configure_wopi import (
    WOPI_CONFIGURATION_CACHE_KEY,
    WOPI_DEFAULT_CONFIGURATION,
)

LAUNCH_URL_PLACEHOLDER_REGEX = r"(<(?P<name>[a-z]+)=(?P<placeholder>[a-zA-Z0-9_]+)&?>)"


def is_item_wopi_supported(item, user):
    """
    Check if an item is supported by WOPI.
    """
    return bool(get_wopi_client_config(item, user))


def get_wopi_client_config(item, user):
    """make
    Get the WOPI client configuration for an item.
    """
    if (
        item.type != models.ItemTypeChoices.FILE
        or item.upload_state == models.ItemUploadStateChoices.SUSPICIOUS
        or (
            item.creator != user
            and item.upload_state != models.ItemUploadStateChoices.READY
        )
    ):
        return None

    wopi_configuration = cache.get(
        WOPI_CONFIGURATION_CACHE_KEY, default=WOPI_DEFAULT_CONFIGURATION
    )

    if not wopi_configuration:
        return None

    result = None
    # Extension must always be checked first.
    if item.extension in wopi_configuration["extensions"]:
        result = wopi_configuration["extensions"][item.extension]
    elif item.mimetype in wopi_configuration["mimetypes"]:
        result = wopi_configuration["mimetypes"][item.mimetype]

    return result


def compute_wopi_launch_url(launch_url, get_file_info_path, lang=None):
    """
    Compute the WOPI launch URL for an item.
    """
    launch_url = launch_url.rstrip("?")
    launch_url = launch_url.rstrip("&")

    wopi_src_base_url = settings.WOPI_SRC_BASE_URL
    wopi_src = get_file_info_path
    if wopi_src_base_url:
        wopi_src = f"{wopi_src_base_url}{get_file_info_path}"

    query_params = {
        "WOPISrc": wopi_src,
        "closebutton": "false",  # Collabora specific
    }

    if lang:
        query_params["lang"] = lang

    # List of placeholders available here
    # https://learn.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/online/discovery#placeholder-values
    placeholders = {
        "UI_LLCC": lang,
        "DC_LLCC": lang,
        "DISABLE_CHAT": settings.WOPI_DISABLE_CHAT,
    }

    parsed_launch_url = urlparse(launch_url)

    matches = re.finditer(LAUNCH_URL_PLACEHOLDER_REGEX, launch_url)

    for match in matches:
        if (
            match.group("placeholder") in placeholders
            and placeholders[match.group("placeholder")] is not None
        ):
            query_params[match.group("name")] = placeholders[match.group("placeholder")]

    return parsed_launch_url._replace(query=urlencode(query_params)).geturl()
