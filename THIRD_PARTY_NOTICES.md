# Third-party notices

## FFmpeg sidecar

SwipeClean bundles FFmpeg as a separate executable. These builds exclude GPL-only
and nonfree components. The macOS build is LGPL v2.1-or-later; the Windows/Linux
builds use LGPL v3. The sidecar is downloaded during the first desktop
development run or build and is verified against the pinned SHA-256 digest in
`scripts/download-ffmpeg.mjs`.

### macOS (arm64 and x86_64)

* FFmpeg 7.1, built with LGPL enabled and GPL/nonfree disabled.
* Includes libvpx 1.14.1 and libwebp 1.4.0; the build uses their upstream BSD
  licensed source.
* License: GNU LGPL v2.1 or later.
* Binary release: [ffmpeg-macos-lgpl, tag `ffmpeg-7.1-r2`](https://github.com/EricEngineering/ffmpeg-macos-lgpl/releases/tag/ffmpeg-7.1-r2)
* Build script and pinned upstream source versions:
  [build-ffmpeg-macos.sh](https://github.com/EricEngineering/ffmpeg-macos-lgpl/blob/ffmpeg-7.1-r2/.github/scripts/build-ffmpeg-macos.sh)
* FFmpeg source: [7.1 release](https://ffmpeg.org/releases/ffmpeg-7.1.tar.xz)

### Windows x64 and Linux x64/ARM64

* FFmpeg build `N-128909-g604ef3784d` from the pinned FFmpeg-Builds release.
* Uses the upstream `lgpl` variant (`COPYING.LGPLv3`), which excludes GPL-only
  dependencies; the `nonfree` variant is not used. The pinned build includes
  libvpx for VP9 encoding.
* Binary release:
  [autobuild-2026-11-14-12-37](https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/tag/autobuild-2026-11-14-12-37)
* Build instructions, variant descriptions, and dependency source references:
  [FFmpeg-Builds at the pinned release](https://github.com/FFmpeg-Builds/FFmpeg-Builds/tree/autobuild-2026-11-14-12-37)
* FFmpeg source revision:
  [g604ef3784d](https://github.com/FFmpeg/FFmpeg/commit/g604ef3784d)

### License texts and corresponding source

FFmpeg is free software; see the [GNU LGPL v2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html),
the [GNU LGPL v3](https://www.gnu.org/licenses/lgpl-3.0.html), and the [FFmpeg licensing page](https://ffmpeg.org/legal.html). The source/build
references above identify the corresponding FFmpeg source and the pinned
third-party dependency build inputs. FFmpeg licensing depends on the components
enabled in each build; verify the included build configuration before changing
these pins or redistributing a modified build.

MKV/AVI and detected HEVC Main 10 MP4/MOV previews are transcoded to WebM using
the LGPL-compatible VP9 and Opus encoders included in the selected builds.
