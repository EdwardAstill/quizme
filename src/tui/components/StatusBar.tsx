import { Box, Text } from "ink";

interface KeyHint {
  key: string;
  label: string;
}

interface StatusBarProps {
  keys: KeyHint[];
  message?: string;
}

export function StatusBar({ keys, message }: StatusBarProps) {
  return (
    <Box marginTop={1} flexDirection="column">
      {message && (
        <Text color="green">{message}</Text>
      )}
      <Box gap={2}>
        {keys.map((k) => (
          <Text key={k.key}>
            <Text color="cyan" bold>[{k.key}]</Text>
            <Text> {k.label}</Text>
          </Text>
        ))}
      </Box>
    </Box>
  );
}
