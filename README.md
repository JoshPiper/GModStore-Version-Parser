# GModStore Deployment Action

Easily upload an addon build to GModStore.

## Usage
```yml
- name: Get Upload Information
  uses: JoshPiper/GModStore-Version-Parser@v0.1.1
  id: version
- name: Dump Information
  run: echo "${{ toJSON(steps.version.outputs) }}"
```

## Inputs

### version
[**Optional, default: GITHUB_REF **] An explicit version, such as if you use a conventional commit parser. 

## Outputs

### branch
[**Boolean**] True if the action is running on a branch.

### tag
[**Boolean**] True if the action is running on a tag / release.

### (raw)version
[**String**] Either the version tag, for the GitHub API, or the cleaned tag, for GModStore.

### deploy
[**String/False**] The type of version which should be uploaded, or false if none. This can be passed directly into GModStore-Deployment/type.
