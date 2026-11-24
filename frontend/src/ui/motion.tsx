import { useIonViewWillEnter } from '@ionic/react';
import { HTMLMotionProps, motion, Variants } from 'framer-motion';
import { ReactNode, useState } from 'react';

/** One easing curve everywhere = a coherent motion language. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const SPRING = { type: 'spring', stiffness: 420, damping: 32 } as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE } },
};

/** Ionic keeps pages alive, so replay entrance animations every time a page is entered. */
export function useEnterKey() {
  const [k, setK] = useState(0);
  useIonViewWillEnter(() => setK((x) => x + 1));
  return k;
}

/** Children marked <Item> cascade in one after another. */
export function Stagger({ children, k, className }: { children: ReactNode; k?: number; className?: string }) {
  return (
    <motion.div key={k} variants={container} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function Item(props: HTMLMotionProps<'div'>) {
  return <motion.div variants={itemVariants} {...props} />;
}

/** Card/button that gently compresses when pressed. */
export function Pressable(props: HTMLMotionProps<'div'>) {
  return <motion.div whileTap={{ scale: 0.975 }} transition={SPRING} {...props} />;
}

export const monogram = (s: string) =>
  s.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
