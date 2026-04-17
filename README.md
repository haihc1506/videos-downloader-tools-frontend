# XHS Downloader Frontend

React frontend application for downloading and editing media from Xiaohongshu (XHS), TikTok, and Douyin platforms.

## Features

- 🎨 Modern React UI with Tailwind CSS
- 📥 Easy media download from multiple platforms
- 🎬 Video editing capabilities (trim, watermark removal)
- 🤖 AI-powered media analysis
- 📱 Responsive design
- ⚡ Hot module reloading (HMR) in development

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Backend API server running (see [xhs-downloader-backend](../xhs-downloader-backend))

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/xhs-downloader-frontend.git
cd xhs-downloader-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file (copy from `.env.example`):
```bash
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:
```
API_URL=http://localhost:3000
GEMINI_API_KEY=your_api_key_here
DISABLE_HMR=false
```

## Development

Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

The development server is configured to proxy API calls to `http://localhost:3000` (backend).

## Production

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

The built files will be in the `dist/` directory.

## Project Structure

```
├── src/
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── app/
│   └── applet/             # Applet-related components
│       ├── test-env.js
│       └── test-gemini.ts
├── public/                 # Static assets
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

## Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Check TypeScript types
- `npm run type-check` - Full type checking

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Backend API URL | http://localhost:3000 |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `DISABLE_HMR` | Disable hot module reloading | false |

## Technologies

- **React 19** - UI framework
- **TypeScript** - Language
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Markdown** - Markdown rendering
- **Motion** - Animations
- **Axios** - HTTP client

## Development Tips

### TypeScript
Run type checking:
```bash
npm run type-check
```

### Formatting
The project uses Tailwind CSS for styling. Ensure all styles are written using Tailwind utilities.

### Components
Place reusable components in appropriate directories under `src/`.

## API Integration

The frontend communicates with the backend API at `http://localhost:3000/api/`

### Available API Endpoints:
- `POST /api/download` - Download media
- `POST /api/bulk-download` - Batch download
- `POST /api/edit/remove-watermark` - Remove watermark
- `POST /api/edit/trim` - Trim video
- `GET /api/health` - Health check

## Proxy Configuration

In development, API requests are proxied to the backend through Vite proxy configuration. This is configured in `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: process.env.API_URL || 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

## Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
3. Push to the branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Backend

For the backend API server, see [xhs-downloader-backend](../xhs-downloader-backend)

## Support

For issues and questions, please create an issue in the GitHub repository.
