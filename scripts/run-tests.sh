#!/bin/bash
# Wrapper to maintain backwards compatibility with scripts/run-tests.sh
DIR="$(dirname "$0")"
# Execute the real script one directory up
"$DIR/../script/run-tests.sh" "$@"
