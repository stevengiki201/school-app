import React, { useEffect, useRef, useState } from "react";
import {
  LayoutRectangle,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { Portal } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * A small dropdown menu anchored to a view (or to screen coordinates).
 *
 * react-native-paper's Menu runs its own open/close animation state machine
 * internally. When the menu is re-opened while the close animation is still
 * running, that internal state can end up "visible" but unmounted, after
 * which further taps on the anchor do nothing. This implementation has no
 * animation state to desync: `visible` is the single source of truth, so
 * every tap reliably opens or closes the menu.
 */
type CoordinateAnchor = { x: number; y: number };

export type AnchoredMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  anchor: React.ReactNode | CoordinateAnchor;
  children: React.ReactNode;
  anchorPosition?: "top" | "bottom";
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

const isCoordinate = (anchor: unknown): anchor is CoordinateAnchor =>
  !!anchor &&
  typeof anchor === "object" &&
  "x" in (anchor as any) &&
  "y" in (anchor as any);

const SCREEN_INDENT = 8;

export function AnchoredMenu({
  visible,
  onDismiss,
  anchor,
  children,
  anchorPosition = "top",
  contentStyle,
  testID,
}: AnchoredMenuProps) {
  const window = useWindowDimensions();
  const anchorRef = useRef<View | null>(null);
  const [anchorRect, setAnchorRect] = useState<LayoutRectangle | null>(
    isCoordinate(anchor) ? { ...anchor, width: 0, height: 0 } : null
  );
  const [menuSize, setMenuSize] = useState({ width: 0, height: 0 });
  // Primitive deps: callers commonly pass a fresh `{x, y}` object each render,
  // so depending on the object itself would re-measure on every render.
  const coordinateX = isCoordinate(anchor) ? anchor.x : null;
  const coordinateY = isCoordinate(anchor) ? anchor.y : null;

  // Measure the anchor every time the menu opens so it follows scrolling and
  // layout changes. The anchor is already mounted at this point.
  useEffect(() => {
    if (!visible) return;
    if (coordinateX !== null && coordinateY !== null) {
      setAnchorRect((prev) =>
        prev && prev.x === coordinateX && prev.y === coordinateY
          ? prev
          : { x: coordinateX, y: coordinateY, width: 0, height: 0 }
      );
      return;
    }
    const node = anchorRef.current;
    if (!node) return;
    node.measureInWindow((x, y, width, height) => {
      setAnchorRect({ x, y, width, height });
    });
  }, [visible, coordinateX, coordinateY]);

  // Escape closes the menu, matching platform menu behaviour.
  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keyup", onKeyUp);
    return () => document.removeEventListener("keyup", onKeyUp);
  }, [visible, onDismiss]);

  if (!visible) {
    return (
      <View ref={anchorRef} collapsable={false}>
        {isCoordinate(anchor) ? null : anchor}
      </View>
    );
  }

  const rect = anchorRect ?? { x: 0, y: 0, width: 0, height: 0 };
  const rawTop =
    anchorPosition === "bottom" && !isCoordinate(anchor)
      ? rect.y + rect.height
      : rect.y;
  const left = Math.max(
    SCREEN_INDENT,
    Math.min(rect.x, window.width - menuSize.width - SCREEN_INDENT)
  );
  const top = Math.max(
    SCREEN_INDENT,
    Math.min(rawTop, window.height - menuSize.height - SCREEN_INDENT)
  );

  return (
    <View ref={anchorRef} collapsable={false}>
      {isCoordinate(anchor) ? null : anchor}
      <Portal>
        <Pressable
          accessibilityLabel="Close menu"
          accessibilityRole="button"
          onPress={onDismiss}
          style={styles.overlay}
        />
        {anchorRect ? (
          <View
            testID={testID}
            style={[
              styles.menu,
              { left, top, opacity: menuSize.width ? 1 : 0 },
              contentStyle,
            ]}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width && height && (width !== menuSize.width || height !== menuSize.height)) {
                setMenuSize({ width, height });
              }
            }}
          >
            {children}
          </View>
        ) : null}
      </Portal>
    </View>
  );
}

export type AnchoredMenuItemProps = {
  title: string;
  onPress: () => void;
  leadingIcon?: string;
  titleStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function AnchoredMenuItem({
  title,
  onPress,
  leadingIcon,
  titleStyle,
  style,
  disabled,
}: AnchoredMenuItemProps) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
        style,
      ]}
    >
      {leadingIcon ? (
        <MaterialCommunityIcons
          name={leadingIcon as any}
          size={18}
          color={(StyleSheet.flatten(titleStyle)?.color as string) ?? "#333"}
        />
      ) : null}
      <Text style={[styles.itemTitle, titleStyle]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
  },
  menu: {
    position: "absolute",
    minWidth: 140,
    maxWidth: 280,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  itemPressed: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  itemTitle: {
    fontSize: 14,
    flexShrink: 1,
  },
});

export default AnchoredMenu;
