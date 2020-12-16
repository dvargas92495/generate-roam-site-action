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
uses: dvargas92495/generate-roam-site-action@v1.0
with:
    roam_username: dvargas92495@gmail.com
    roam_password: ${{ secrets.ROAM_PASSWORD }}
    roam_graph: dvargas92495
```

I have an [example repository](https://github.com/dvargas92495/public-garden) showcasing this action. The resulting site is reachable at https://garden.davidvargas.me.
