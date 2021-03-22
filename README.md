# Generate Roam Site Action

A GitHub action for generating a static site from a Roam Graph. This action is a wrapper around the [generate-roam-site](https://www.npmjs.com/package/generate-roam-site) npm package.

## Inputs

### `roam_username`

**Required** Your Roam username

### `roam_password`

**Required** Your Roam password

### `roam_graph`

**Required** Your Roam Graph

### `config_path`

**Required** The path to the json file use to override and Roam config settings, relative to `GITHUB_WORKSPACE`. Default value is `static_site.json`.

## Usage

```yaml
uses: dvargas92495/generate-roam-site-action@2.5.6
with:
    roam_username: dvargas92495@gmail.com
    roam_password: ${{ secrets.ROAM_PASSWORD }}
    roam_graph: dvargas92495
```

I have an [example repository](https://github.com/dvargas92495/public-garden) showcasing this action. The resulting site is reachable at https://garden.davidvargas.me.
