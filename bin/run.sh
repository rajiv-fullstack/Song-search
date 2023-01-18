#!/usr/bin/env bash
set -eo pipefail


usage() {
  echo "usage: ./bin/run.sh start|bash"
  exit 1
}

export REACT_APP_NO_ADS=true

[ $# -lt 1 ] && usage

case $1 in
  start)
    # The `| cat` is to trick Node that this is an non-TTY terminal
    # then react-scripts won't clear the console.
    yarn start | cat
    ;;
  bash)
    exec "$@"
    ;;
  *)
    exec "$@"
    ;;
esac
