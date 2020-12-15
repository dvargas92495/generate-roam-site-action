# Generate Roam Site Action

A GitHub action for generating a static site from a Roam Graph.

## Inputs

### `roam-username`

**Required** Your Roam username

### `roam-password`

**Required** Your Roam password

### `roam-graph`

**Required** Your Roam Graph

## Example Usage

```yaml
uses: actions/generate-roam-site-action@v1.0
with:
    roam-username: dvargas92495@gmail.com
    roam-password: {{ secrets.ROAM_PASSWORD }}
    roam-graph: dvargas92495
```