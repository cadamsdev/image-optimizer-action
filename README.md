# Image Optimizer Action

[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/cadamsdev/notes/issues) [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0) ![GitHub Tag](https://img.shields.io/github/v/tag/cadamsdev/image-optimizer-action)

A GitHub action that automatically compresses images in pull requests. Free and open-source alternative to [imgbot](https://imgbot.net/).

## ✨ Features

✅ Fast, efficient and near-lossless compression

✅ Supports compressing SVG, PNG, JPG, GIF, WEBP, and AVIF

✅ Can export PNG, JPG and GIF to WEBP

✅ Can export PNG, JPG and WEBP to AVIF

✅ Highly [customizable](#configuration)

✅ Supports GitHub Enterprise

[View On GitHub Marketplace](https://github.com/marketplace/actions/image-optimizer-action)

This tool is completely free. If you enjoy the tool please help support us.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/cadamsdev)

# 📚 Table of Contents

1. [Media](#media)
2. [Usage](#usage)
3. [Configuration](#configuration)
4. [Permissions](#permissions)

## 🖼️ Media

![Screenshot 2024-11-25 231001](https://github.com/user-attachments/assets/281fd292-ec99-4bf8-a094-2f9a6713370d)

## 🚀 Usage

### Pull request workflow

Create file .github/workflows/image-optimizer.yml

```yml
name: Compress Images

on:
  pull_request:
    paths:
      - '**/*.svg'
      - '**/*.png'
      - '**/*.jpg'
      - '**/*.jpeg'
      - '**/*.gif'
      - '**/*.webp'
      - '**/*.avif'

jobs:
  build:
    if: github.event.pull_request.head.repo.full_name == github.repository
    name: cadamsdev/image-optimizer-action
    permissions: write-all
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4

      - name: Compress Images
        id: compress-images
        uses: cadamsdev/image-optimizer-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Manual Workflow

Create file .github/workflows/image-optimizer-manual.yml

```yml
name: Compress Images (Manual)

on: workflow_dispatch

jobs:
  build:
    name: cadamsdev/image-optimizer-action
    permissions: write-all
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4

      - name: Compress Images
        id: compress-images
        uses: cadamsdev/image-optimizer-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Create New Pull Request If Needed
        if: steps.compress-images.outputs.markdown_report != ''
        uses: peter-evans/create-pull-request@v5
        with:
          title: Compressed Images
          branch-suffix: timestamp
          commit-message: Compressed Images
          body: ${{ steps.compress-images.outputs.markdown_report }}
```

### Scheduling

[GitHub Actions scheduling](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule).

```yml
name: Compress Images (Manual)

on:
  workflow_dispatch:
  schedule:
    # For daily runs at midnight UTC, use:
    - cron: '0 0 * * *'
    # For weekly runs (e.g., every Sunday at midnight UTC), use:
    # - cron: '0 0 * * 0'

jobs:
  build:
    name: cadamsdev/image-optimizer-action
    permissions: write-all
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4

      - name: Compress Images
        id: compress-images
        uses: cadamsdev/image-optimizer-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Create New Pull Request If Needed
        if: steps.compress-images.outputs.markdown_report != ''
        uses: peter-evans/create-pull-request@v5
        with:
          title: Compressed Images
          branch-suffix: timestamp
          commit-message: Compressed Images
          body: ${{ steps.compress-images.outputs.markdown_report }}
```

## 🔧 Configuration

e.g

```yml
with:
  github-token: ${{ secrets.GITHUB_TOKEN }}
  export-webp: true
  export-avif: true
  replace-original-after-export-webp: true
  ignore-paths: |
    src/assets/images/some-dir/**
    src/assets/images/another-dir/**
```

| Input                              | Description                                       | Type              | Default           |
| ---------------------------------- | ------------------------------------------------- | ----------------- | ----------------- |
| github-token                       | The generated GitHub token                        | string (required) | ''                |
| debug                              | Enables verbose logging for easier debugging      | boolean           | false             |
| compress-png                       | Enables compressing PNGs                          | boolean           | true              |
| compress-svg                       | Enables compressing SVGs                          | boolean           | true              |
| compress-jpg                       | Enables compressing JPG / JPEGs                   | boolean           | true              |
| compress-webp                      | Enables compressing WEBPs                         | boolean           | true              |
| compress-avif                      | Enables compressing AVIFs                         | boolean           | true              |
| export-webp                        | Converts PNG, JPG / JPEG into WEBP                | boolean           | false             |
| export-avif                        | Converts PNG, JPG / JPEG, WEBP into AVIF          | boolean           | false             |
| replace-original-after-export-webp | Replace original files after exporting WebP files | boolean           | false             |
| ignore-paths                       | Paths of globs to prevent from processing         | string[]          | node_modules/\*\* |

## 🔒 Permissions

Make sure to check "Allow GitHub Actions to create and approve pull requests" if you're using the manual workflow.

![Screenshot 2024-11-25 230654](https://github.com/user-attachments/assets/87e4e3c3-427d-427e-abba-5843b6d32f2f)
