import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, TouchableOpacity, Image } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { NothingColors } from '../../constants/theme';
import { NothingText } from '../common/NothingText';
import { useThemeStore } from '../../store/useThemeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DISC_SIZE = Math.min(SCREEN_WIDTH * 0.74, 280);
const RADIUS = DISC_SIZE / 2;
const ARC_RADIUS = RADIUS + 16;

export interface VinylDiscProps {
  artwork: string;
  artist: string;
  album?: string;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  onPress?: () => void;
  speed?: string;
  onToggleSpeed?: () => void;
  onSeek?: (seconds: number) => void;
  onScrubPreview?: (seconds: number | null) => void;
}

export const VinylDisc: React.FC<VinylDiscProps> = ({ artwork, artist, album, isPlaying, positionMillis, durationMillis, onPress }) => {
  const { colors, isDark } = useThemeStore();
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isPlaying) {
      loopRef.current = Animated.loop(
        Animated.timing(rotationAnim, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true, isInteraction: false })
      );
      loopRef.current.start();
    } else {
      if (loopRef.current) loopRef.current.stop();
    }
    return () => { if (loopRef.current) loopRef.current.stop(); };
  }, [isPlaying, rotationAnim]);

  const arcLength = 2 * Math.PI * ARC_RADIUS;
  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;
  
  function formatTime(millis?: number): string {
    if (!millis || isNaN(millis) || millis < 0) return '00:00';
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  const spin = rotationAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const crosshairColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const grooveColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <View style={styles.timeTagRow}>
          <NothingText variant='dot' size={11} color='dim'>
            {formatTime(positionMillis)}/{formatTime(durationMillis)}
          </NothingText>
        </View>
      </View>

      <View style={styles.discOuterWrapper}>
        <Svg width={DISC_SIZE + 44} height={DISC_SIZE + 44} style={styles.svgOverlay}>
          <Circle cx={(DISC_SIZE + 44) / 2} cy={(DISC_SIZE + 44) / 2} r={ARC_RADIUS} fill='none' stroke={colors.surfaceHigh} strokeWidth={3} />
          <Circle cx={(DISC_SIZE + 44) / 2} cy={(DISC_SIZE + 44) / 2} r={ARC_RADIUS} fill='none' stroke={colors.whiteDim} strokeWidth={4.5} strokeDasharray={`${arcLength * 0.28} ${arcLength}`} strokeDashoffset={-arcLength * 0.12 - (arcLength * 0.28 * (1 - progress))} strokeLinecap='round' />
        </Svg>

        <View>
          <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
            <Animated.View style={[styles.disc, { width: DISC_SIZE, height: DISC_SIZE, borderRadius: RADIUS, backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle, transform: [{ rotate: spin }] }]}>
              <Svg width={DISC_SIZE} height={DISC_SIZE} viewBox={`0 0 ${DISC_SIZE} ${DISC_SIZE}`} style={StyleSheet.absoluteFill}>
                <Line x1={RADIUS * 0.2} y1={RADIUS * 0.2} x2={RADIUS * 1.8} y2={RADIUS * 1.8} stroke={crosshairColor} strokeWidth={1} />
                <Line x1={RADIUS * 1.8} y1={RADIUS * 0.2} x2={RADIUS * 0.2} y2={RADIUS * 1.8} stroke={crosshairColor} strokeWidth={1} />
                <Circle cx={RADIUS} cy={RADIUS} r={RADIUS * 0.9} fill='none' stroke={grooveColor} strokeWidth={1} />
                <Circle cx={RADIUS} cy={RADIUS} r={RADIUS * 0.78} fill='none' stroke={grooveColor} strokeWidth={1} />
                <Circle cx={RADIUS} cy={RADIUS} r={RADIUS * 0.65} fill='none' stroke={grooveColor} strokeWidth={1} />
              </Svg>

              <View style={styles.artistLabelWrapper}>
                <NothingText variant='dot' size={9.5} color='dim' numberOfLines={1} style={styles.discText}>
                  {artist.toUpperCase()}
                </NothingText>
              </View>
              <View style={styles.albumLabelWrapper}>
                <NothingText variant='dot' size={9.5} color='dim' numberOfLines={1} style={styles.discText}>
                  {(album || 'NOTHING OS').toUpperCase()}
                </NothingText>
              </View>

              <View style={[styles.centerArtHub, { backgroundColor: colors.surfaceLowest, borderColor: colors.glassBorder }]}>
                <Image source={{ uri: artwork }} style={styles.thumbnailArtwork} />
                <View style={[styles.spindleCenter, { backgroundColor: colors.background, borderColor: colors.glassBorder }]}>
                  <View style={styles.spindleInnerDot} />
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.redDotWrapper}>
          <View style={styles.redDot} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  infoRow: { width: DISC_SIZE + 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 8, zIndex: 5 },
  timeTagRow: { flexDirection: 'row', alignItems: 'center' },
  discOuterWrapper: { width: DISC_SIZE + 44, height: DISC_SIZE + 44, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  svgOverlay: { position: 'absolute', top: 0, left: 0 },
  disc: { backgroundColor: '#161616', alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.85, shadowRadius: 18, elevation: 14, borderWidth: 2, borderColor: '#242424', overflow: 'hidden', position: 'relative' },
  artistLabelWrapper: { position: 'absolute', top: '16%', left: '14%', transform: [{ rotate: '-35deg' }], maxWidth: '50%' },
  albumLabelWrapper: { position: 'absolute', bottom: '16%', right: '14%', transform: [{ rotate: '-35deg' }], maxWidth: '50%' },
  discText: { letterSpacing: 1.5 },
  centerArtHub: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', borderWidth: 2.5, borderColor: 'rgba(255, 255, 255, 0.18)', alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: '#0A0A0A' },
  thumbnailArtwork: { width: '100%', height: '100%' },
  spindleCenter: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#000000', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.3)', alignItems: 'center', justifyContent: 'center' },
  spindleInnerDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: NothingColors.red },
  redDotWrapper: { position: 'absolute', bottom: 24, left: 14 },
  redDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: NothingColors.red, shadowColor: NothingColors.red, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 6, elevation: 5 },
});
