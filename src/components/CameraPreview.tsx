import { CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { forwardRef, useImperativeHandle } from 'react';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';

interface CameraPreviewProps {
  facing?: 'front' | 'back';
  showGuide?: boolean;
  guideLabel?: string;
  onReady?: () => void;
}

export interface CameraPreviewHandle {
  takePhoto: () => Promise<{ uri: string } | null>;
}

const CameraPreview = forwardRef<CameraPreviewHandle, CameraPreviewProps>(
  ({ facing = 'front', showGuide = true, guideLabel, onReady }, ref) => {
    const [permission, requestPermission] = useCameraPermissions();

    useImperativeHandle(ref, () => ({
      takePhoto: async () => {
        return null;
      },
    }));

    if (!permission) {
      return <View style={styles.placeholder} />;
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Akses kamera dibutuhkan</Text>
          <Text style={styles.permissionBody}>
            Kami butuh kamera depan untuk foto selfie absensi.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Izinkan Kamera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.wrapper}>
        <CameraView
          style={styles.camera}
          facing={facing}
          mode="picture"
          mirror
          onCameraReady={onReady}
        />
        {showGuide ? (
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.guide} />
            {guideLabel ? (
              <Text style={styles.guideLabel}>{guideLabel}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }
);

CameraPreview.displayName = 'CameraPreview';

export default CameraPreview;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.gray[900],
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: {
    width: '62%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.primary[300],
    borderStyle: 'dashed',
    backgroundColor: 'rgba(20,184,166,0.08)',
  },
  guideLabel: {
    position: 'absolute',
    bottom: Spacing.lg,
    color: Colors.white,
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  placeholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: Colors.gray[200],
    borderRadius: Radius.lg,
  },
  permissionBox: {
    width: '100%',
    aspectRatio: 3 / 2.4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray[800],
    marginBottom: Spacing.sm,
  },
  permissionBody: {
    fontSize: 13,
    color: Colors.gray[500],
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  permissionButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  permissionButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
});

