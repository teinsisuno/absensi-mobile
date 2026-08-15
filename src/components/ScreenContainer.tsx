import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import OfflineBanner from './OfflineBanner';

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  hideOfflineBanner?: boolean;
}

export default function ScreenContainer({
  children,
  scroll,
  style,
  contentContainerStyle,
  edges = ['top', 'bottom'],
  hideOfflineBanner,
}: ScreenContainerProps) {
  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={edges}>
        {!hideOfflineBanner ? <OfflineBanner /> : null}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      {!hideOfflineBanner ? <OfflineBanner /> : null}
      <View style={[styles.flex, contentContainerStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screen,
    paddingBottom: Spacing.xxl,
  },
});

