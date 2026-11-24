import {
  IonContent, IonHeader, IonIcon, IonLabel, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToolbar,
  useIonRouter, useIonViewWillEnter,
} from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import { chevronForward, layersOutline } from 'ionicons/icons';
import { useState } from 'react';
import HelpButton from '../components/HelpButton';
import { api, Episode } from '../services/api';
import { EASE, monogram, Pressable } from '../ui/motion';

type Tab = 'active' | 'closed';

export default function Episodes() {
  const [tab, setTab] = useState<Tab>('active');
  const [items, setItems] = useState<Episode[] | null>(null);
  const router = useIonRouter();

  const load = (s: Tab = tab) => {
    setItems(null);
    api<Episode[]>(`/episodes?status=${s}`).then(setItems).catch(() => setItems([]));
  };
  useIonViewWillEnter(() => load());

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar><IonTitle>Episodes</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar><IonTitle size="large">Episodes</IonTitle></IonToolbar>
        </IonHeader>

        <div className="page">
          <IonSegment value={tab} onIonChange={(e) => { const s = e.detail.value as Tab; setTab(s); load(s); }} style={{ marginBottom: 20 }}>
            <IonSegmentButton value="active"><IonLabel>Active</IonLabel></IonSegmentButton>
            <IonSegmentButton value="closed"><IonLabel>History</IonLabel></IonSegmentButton>
          </IonSegment>

          {items === null && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 78, marginBottom: 12 }} />)}

          <AnimatePresence mode="popLayout">
            {items?.length === 0 && (
              <motion.div key={`empty-${tab}`} className="empty" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <div className="empty-icon float"><IonIcon icon={layersOutline} /></div>
                <div style={{ fontWeight: 650, color: 'var(--ck-text)' }}>{tab === 'active' ? 'No active episodes' : 'No past episodes yet'}</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>{tab === 'active' ? 'Tap New to start one.' : 'Closed episodes appear here.'}</div>
              </motion.div>
            )}
            {items?.map((e, i) => (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ delay: i * 0.05, duration: 0.5, ease: EASE }}
              >
                <Pressable className="card tap" onClick={() => router.push(`/episodes/${e.id}`)}>
                  <div className="row">
                    <div className="mono">{monogram(e.category)}</div>
                    <div className="grow">
                      <div className="ellipsis" style={{ fontWeight: 650 }}>{e.title}</div>
                      <div className="muted ellipsis" style={{ fontSize: 14 }}>{e.issue_description || e.category}</div>
                    </div>
                    <IonIcon icon={chevronForward} style={{ color: 'var(--ck-faint)' }} />
                  </div>
                </Pressable>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <HelpButton />
      </IonContent>
    </IonPage>
  );
}
