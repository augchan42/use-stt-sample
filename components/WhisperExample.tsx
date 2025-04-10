import dynamic from 'next/dynamic';

// Import the client component with no SSR
const ClientWhisperExample = dynamic(
  () => import('./ClientWhisperExample'),
  { ssr: false }
);

export default function WhisperExample() {
  return <ClientWhisperExample />;
} 