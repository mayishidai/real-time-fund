'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import { Home, User } from 'lucide-react';

const TABS = [
  { id: 'home', label: '首页', Icon: Home },
  { id: 'mine', label: '我的', Icon: User },
];

export default function MobileBottomNav({ value, onChange }) {
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  if (!mounted || typeof document === 'undefined') return null;

  const spring = reduceMotion
    ? { duration: 0.2 }
    : { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 };

  const tapSpring = reduceMotion
    ? { duration: 0.15 }
    : { type: 'spring', stiffness: 600, damping: 32 };

  /* 通过 Portal 挂到 body，配合 .mobile-bottom-nav-shell 的 position:fixed，底栏相对视口固定、不随页面滚动 */
  const node = (
    <div className="mobile-bottom-nav-shell">
      <LayoutGroup id="mobile-tab-bar">
        <nav className="mobile-bottom-nav-bar" role="navigation" aria-label="主导航">
          <div className="mobile-bottom-nav-track">
            {TABS.map(({ id, label, Icon }) => {
              const active = value === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`mobile-bottom-nav-tab ${active ? 'is-active' : ''}`}
                  onClick={() => onChange(id)}
                  aria-current={active ? 'page' : undefined}
                >
                  {active && (
                    <motion.div
                      layoutId="mobile-tab-ios-pill"
                      className="mobile-bottom-nav-pill"
                      transition={spring}
                      initial={false}
                    />
                  )}
                  <span className="mobile-bottom-nav-tab-inner">
                    <span className="mobile-bottom-nav-icon-wrap">
                      <Icon
                        className="mobile-bottom-nav-icon"
                        aria-hidden
                        strokeWidth={2}
                      />
                    </span>
                    <motion.span
                      className="mobile-bottom-nav-label"
                      animate={{
                        opacity: active ? 1 : 0.5,
                        fontWeight: active ? 600 : 500,
                      }}
                      transition={tapSpring}
                    >
                      {label}
                    </motion.span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </LayoutGroup>
    </div>
  );

  return createPortal(node, document.body);
}
