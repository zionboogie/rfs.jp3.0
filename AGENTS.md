## Development

開発サーバーを起動する際は、バックグラウンドモードを使用してください。

```
astro dev --background
```

管理: `astro dev stop` / `astro dev status` / `astro dev logs`

## AIコーディング

- 実装前に既存のコード・コンポーネント・構成を確認する
- 関係のないファイルは変更しない
- 大きな変更の前に既存構成を確認する
- 変更後は可能な範囲でビルドやエラーを確認する
- 新しいライブラリ・npm パッケージは追加前に確認する（既存で足りるなら追加しない）
- package.json のバージョンを必要以上に変更しない
- 独自のデザインや実装方針を勝手に追加しない（既存ルール・設計を優先）

## 詳細ルールの所在

技術・デザインの詳細は `.cursor/rules/` に分離しています（重複させない）。

| ファイル | 適用 | 内容 |
|---|---|---|
| `project.mdc` | 常時 | スタック・作業方針 |
| `design.mdc` | 常時 | デザインシステム |
| `tailwind.mdc` | `*.astro` / `*.css` | Tailwind の書き方 |
| `astro.mdc` | `*.astro` | Astro / SEO / a11y |
| `wordpress.mdc` | 常時 | Headless WordPress |

## ドキュメント

関連作業の前に公式ドキュメントを確認してください。

- https://docs.astro.build
- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Framework components](https://docs.astro.build/en/guides/framework-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling / Tailwind](https://docs.astro.build/en/guides/styling/)
- [i18n](https://docs.astro.build/en/guides/internationalization/)
