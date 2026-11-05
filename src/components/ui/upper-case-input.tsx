"use client";

import type { ChangeEvent, ComponentProps, CompositionEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toUpper } from "@/lib/upper-case";
import { cn } from "@/lib/utils";

type TextElement = HTMLInputElement | HTMLTextAreaElement;

/** Converte o valor do próprio campo, sem o cursor pular para o fim. */
function upperInPlace(element: TextElement): string {
  const next = toUpper(element.value);
  if (next !== element.value) {
    const { selectionStart, selectionEnd } = element;
    const sameLength = next.length === element.value.length;
    element.value = next;
    if (sameLength && selectionStart !== null && selectionEnd !== null) {
      element.setSelectionRange(selectionStart, selectionEnd);
    }
  }
  return element.value;
}

/**
 * Durante a composição (teclados de celular, acentos), o texto passa como
 * está e é convertido ao fim; o CSS `uppercase` já mostra em maiúscula.
 */
function handlers<E extends TextElement>(onValueChange: (value: string) => void) {
  return {
    onChange: (event: ChangeEvent<E>) => {
      const composing = (event.nativeEvent as InputEvent).isComposing;
      onValueChange(composing ? event.target.value : upperInPlace(event.target));
    },
    onCompositionEnd: (event: CompositionEvent<E>) => {
      onValueChange(upperInPlace(event.currentTarget));
    },
  };
}

const UPPER_CASE_CLASS = "uppercase placeholder:normal-case";

type UpperCaseProps<P> = Omit<P, "onChange" | "value"> & {
  value: string;
  onValueChange: (value: string) => void;
};

/** <Input> controlado que só aceita maiúsculas. */
export function UpperCaseInput({
  onValueChange,
  className,
  ...props
}: UpperCaseProps<ComponentProps<typeof Input>>) {
  return (
    <Input
      autoCapitalize="characters"
      {...props}
      {...handlers<HTMLInputElement>(onValueChange)}
      className={cn(UPPER_CASE_CLASS, className)}
    />
  );
}

/** <Textarea> controlado que só aceita maiúsculas. */
export function UpperCaseTextarea({
  onValueChange,
  className,
  ...props
}: UpperCaseProps<ComponentProps<typeof Textarea>>) {
  return (
    <Textarea
      autoCapitalize="characters"
      {...props}
      {...handlers<HTMLTextAreaElement>(onValueChange)}
      className={cn(UPPER_CASE_CLASS, className)}
    />
  );
}
