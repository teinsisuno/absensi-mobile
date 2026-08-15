import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { Colors } from '../theme/colors';
import { Radius } from '../theme/spacing';
import { isDataUri } from '../services/photo';

interface SelfieThumbnailProps {
  photo?: string | null;
  size?: number;
}

export default function SelfieThumbnail({ photo, size = 44 }: SelfieThumbnailProps) {
  const [open, setOpen] = useState(false);

  if (!photo) return null;

  const source = isDataUri(photo) ? { uri: photo } : { uri: photo };

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)}>
        <Image
          source={source}
          style={{ width: size, height: size, borderRadius: Radius.sm }}
        />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Image source={source} style={styles.fullImage} resizeMode="contain" />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: Colors.white,
    fontSize: 18,
  },
});

