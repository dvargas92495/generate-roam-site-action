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
uses: dvargas92495/generate-roam-site-action@v1.4.0
with:
    roam_username: dvargas92495@gmail.com
    roam_password: ${{ secrets.ROAM_PASSWORD }}
    roam_graph: dvargas92495
```

Most other configuration happens from your Roam DB, on a page called `roam/js/public-garden`. The following configuration options are supported:
- Index - The page name that will serve as the entry point of the site.
- Filter - A set of rules that specifies which pages to build. If a page matches any child rule, it will be built into the site. The following rules are supported:
    - Starts With - If a page starts with the given text, it will be included in the site. Useful for namespacing, e.g. `Article/Article`.
    - Tagged With - If a page contains a tag with the given text, it will be included in the site. Handles all forms of tags and attributes.

Here's an example configuration, that uses the `Personal Website` page as the entry point and includes all pages that start with a `P`:

- Index
    - Personal Website
- Filter
    - Starts With
        - P

Here's an example configuration, that uses the `Blog Post` page as the entry point and includes all pages that are Tagged with `Blog Post`:

- Index
    - Blog Post
- Filter
    - Tagged With
        - Blog Post

I have an [example repository](https://github.com/dvargas92495/public-garden) showcasing this action. The resulting site is reachable at https://garden.davidvargas.me.
