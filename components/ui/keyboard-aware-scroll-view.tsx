import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  ScrollViewProps,
  TextInput,
} from "react-native";

type Props = ScrollViewProps & {
  children: React.ReactNode;
  /** Extra space kept between the focused input and the keyboard. */
  keyboardOffset?: number;
};

/**
 * A ScrollView that follows the keyboard.
 *
 * On Android the app is edge-to-edge, so the window does not resize when the
 * keyboard opens and a plain KeyboardAvoidingView leaves the focused input
 * underneath it. This adds bottom room matching the keyboard height and
 * scrolls the focused input above the keyboard on both platforms.
 */
export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  keyboardOffset = 24,
  onScroll,
  ...rest
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const scrollToFocusedInput = (height: number) => {
      const input = TextInput.State.currentlyFocusedInput();
      if (input == null) return;

      input.measureInWindow((_x, y, _width, inputHeight) => {
        const keyboardTop = Dimensions.get("window").height - height;
        const overflow = y + inputHeight + keyboardOffset - keyboardTop;
        if (overflow > 0) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollY.current + overflow),
            animated: true,
          });
        }
      });
    };

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates.height;
      setKeyboardHeight(height);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Wait for the keyboard padding to be laid out before measuring.
      timeoutRef.current = setTimeout(() => scrollToFocusedInput(height), 100);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [keyboardOffset]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      onScroll={(event) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      }}
      scrollEventThrottle={16}
      contentContainerStyle={[{ flexGrow: 1, paddingBottom: keyboardHeight }, contentContainerStyle]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
