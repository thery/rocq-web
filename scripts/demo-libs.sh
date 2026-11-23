#!/bin/sh
# Installs xtext and cyp (https://github.com/thery/coq_tmp) in the switch as
# the opam package rocq-xtext-cyp, for the examples xtext and cyp
# (docs/this-fork.md). Its sources are the files they need from a commit of
# coq_tmp (main by default), with demo-libs/Makefile and its opam file.
#   sh scripts/demo-libs.sh [COQ_TMP] [COMMIT]      (in the switch: eval "$(make -s env)")
set -e
repo=${1:-$HOME/git/coq_tmp}
commit=${2:-main}
here=$(cd "$(dirname "$0")/.." && pwd)
src=$here/_src/demo-libs
rm -rf "$src"; mkdir -p "$src"
git -C "$repo" archive "$commit" prooftext lexicon xtext/ExtractText.v xtext/elpi cyp/vernac/Gaps.v cyp/vernac/Cyp.v cyp/vernac/elpi |
  tar x -C "$src"
# its version: the commit's date and hash (2026.11.19+9788f12), so that the
# package is listed in the site's package browser (scripts/assets.mjs)
version=$(git -C "$repo" log -1 --date=format:%Y.%m.%d --format=%ad+%h "$commit")
cp "$here/demo-libs/Makefile" "$src/"
sed "1a version: \"$version\"" "$here/demo-libs/rocq-xtext-cyp.opam" > "$src/rocq-xtext-cyp.opam"
opam pin add -y -k path rocq-xtext-cyp "$src"
