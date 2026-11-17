import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

type Props = {
  title: string;
  header?: ReactNode;
  children: ReactNode;
};

export function Screen({ title, header, children }: Props) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {header}
      <Text style={styles.title}>{title}</Text>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    padding: 20,
    paddingBottom: 96,
  },
  title: {
    marginBottom: 16,
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
  },
});
