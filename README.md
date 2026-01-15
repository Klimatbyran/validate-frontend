# Garbo Validation Tool

<img width="1429" alt="image" src="https://github.com/user-attachments/assets/451bf903-d87e-4e1a-a030-22e83c0df155" />

A modern React-based tool for validating and managing workflow queues with real-time updates and interactive visualizations.

## Features

- **Authentication**: GitHub OAuth authentication for secure access (internal tool)
- **Real-time Queue Monitoring**: Track active, waiting, completed, and failed jobs across multiple workflow stages
- **Company-Centric View**: Group jobs by company and view their progress through the workflow
- **Interactive Workflow Diagram**: Visualize the entire workflow process with job counts
- **Detailed Job Inspection**: Examine job details, data, and logs in a user-friendly interface
- **Job Management**: Approve, retry, or manage jobs directly from the dashboard

## Tech Stack

- **Frontend**: React with TypeScript
- **UI Components**: Custom components with Tailwind CSS
- **State Management**: RxJS for reactive state management
- **API Communication**: Axios for HTTP requests
- **Data Fetching**: SWR for data fetching with caching and revalidation
- **Containerization**: Docker for deployment
- **Orchestration**: Kubernetes for container orchestration

## RxJS Architecture

This project uses RxJS for reactive data processing and state management. The application follows a reactive programming paradigm where data flows through streams (Observables) that can be transformed, combined, and consumed.

Key aspects of our RxJS implementation:

- **Reactive Data Flow**: Data flows through streams from API to UI
- **Centralized State Management**: Using BehaviorSubjects in QueueStore
- **Non-blocking Operations**: All data processing is asynchronous
- **Declarative Transformations**: Using operators like map, filter, mergeMap

For detailed information about our RxJS implementation and best practices, see [RxJS Guide](./docs/guides/RxJS-GUIDE.md).

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd <repository-directory>
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Start the development server

```bash
npm run dev
# or
yarn dev
```

The development server will start on `http://localhost:5173` (or the next available port).

4. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Development

### Project Structure

- `/src`: Source code
  - `/components`: UI components
    - `/ui`: Reusable UI components
  - `/hooks`: Custom React hooks
  - `/lib`: Utilities, types, and constants
  - `/assets`: Static assets

### Building for Production

```bash
npm run build
# or
yarn build
```

### Docker Deployment

Build the Docker image:

```bash
docker build -t garbo-validation-tool .
```

Run the container:

```bash
docker run -p 80:80 garbo-validation-tool
```

## Kubernetes Deployment

Apply the Kubernetes manifests:

```bash
kubectl apply -f k8s/
```

## License

[MIT License](LICENSE)
