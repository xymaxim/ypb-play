# Download excerpts with Compose

This guide shows you how to download a highlighted live stream excerpt when
Rewyt and [ypb](https://xymaxim.github.io/ypb/) are run via Compose.

## Prerequisites

- [Podman](https://podman.io/getting-started/installation) or [Docker](https://docs.docker.com/get-docker/)
- Rewyt installed as a [web app](install/web.md), running via Compose

## Highlight the excerpt

!!! note

    For highlighting excerpts in Rewyt, see [Highlight and download excerpts](./download-excerpts.md).

Highlight the excerpt and copy the corresponding timestamp or the download command:

```text
2026-09-05T03:14:15+00:00/2026-09-05T09:26:53+00:00
ypb download -i 2026-09-05T03:14:15+00:00/2026-09-05T09:26:53+00:00 abcdefgh123
```

## Download the excerpt

Run ypb inside the already-running Rewyt container:

```sh
# --workdir must stay /media, it's where the container's volume is mounted
podman compose exec --workdir /media rewyt ypb download \
  2026-09-05T03:14:15+00:00/2026-09-05T09:26:53+00:00 abcdefgh123
```

The file is saved to `./media` by default, or the path set via
[`YPB_MEDIA_DIR`](https://xymaxim.github.io/ypb/guides/install/container/#ypb_media_dir).
