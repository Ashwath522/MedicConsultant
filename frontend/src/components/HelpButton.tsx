import { IonFab, IonFabButton, IonIcon, useIonActionSheet, useIonToast } from '@ionic/react';
import { motion } from 'framer-motion';
import { call } from 'ionicons/icons';
import { api, Contact } from '../services/api';

/** Floating Help button: one tap → choose family/doctor → phone call. */
export default function HelpButton() {
  const [present] = useIonActionSheet();
  const [toast] = useIonToast();

  const open = async () => {
    let contacts: Contact[] = [];
    try {
      contacts = await api<Contact[]>('/contacts');
    } catch { /* offline */ }
    if (!contacts.length) {
      toast({ message: 'Add family or doctor in Profile → Contacts first.', duration: 2500, position: 'top' });
      return;
    }
    present({
      header: 'Call for help',
      subHeader: 'One tap to call',
      buttons: [
        ...contacts.map((c) => ({
          text: `${c.type === 'doctor' ? 'Dr. ' : ''}${c.name.replace(/^Dr\.?\s*/i, '')}${c.relation ? ` · ${c.relation}` : ''}`,
          handler: () => { window.location.href = `tel:${c.phone}`; },
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
  };

  return (
    <IonFab vertical="bottom" horizontal="end" slot="fixed" className="help-fab">
      <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.4, type: 'spring', stiffness: 380, damping: 18 }}>
        <IonFabButton onClick={open} aria-label="Call for help">
          <IonIcon icon={call} />
        </IonFabButton>
      </motion.div>
    </IonFab>
  );
}
