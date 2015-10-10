#!/bin/bash

# pushes the current branch to GitHub so CircleCI has what to build
git config push.default current
git push origin
git config push.default simple

# removes the existing demo tag, creates it again and pushes to GitHub
git tag -d demo
git tag demo
git push -f origin demo
