import {
  IonApp, IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { MotionConfig } from 'framer-motion';
import { add, home, layers, person, pulse } from 'ionicons/icons';
import { Redirect, Route } from 'react-router-dom';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/display.css';
import './theme.css';

import { getToken } from './services/api';
import Login from './pages/Login';
import Home from './pages/Home';
import Episodes from './pages/Episodes';
import NewEpisode from './pages/NewEpisode';
import EpisodeDetail from './pages/EpisodeDetail';
import Timeline from './pages/Timeline';
import RecordConsultation from './pages/RecordConsultation';
import ConsultationView from './pages/ConsultationView';
import Profile from './pages/Profile';
import Contacts from './pages/Contacts';
import Onboarding from './pages/Onboarding';
import BlueprintPage from './pages/BlueprintPage';
import Trends from './pages/Trends';
import Labs from './pages/Labs';
import LabNew from './pages/LabNew';

// iOS look everywhere (nav bars, tab bar, swipe-back), even in a desktop browser.
setupIonicReact({ mode: 'ios' });

const Tabs = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route exact path="/home" component={Home} />
      <Route exact path="/episodes" component={Episodes} />
      <Route exact path="/episodes/:id" component={EpisodeDetail} />
      <Route exact path="/episodes/:id/record" component={RecordConsultation} />
      <Route exact path="/consultations/:id" component={ConsultationView} />
      <Route exact path="/new" component={NewEpisode} />
      <Route exact path="/timeline" component={Timeline} />
      <Route exact path="/profile" component={Profile} />
      <Route exact path="/profile/contacts" component={Contacts} />
      <Route exact path="/blueprint" component={BlueprintPage} />
      <Route exact path="/trends" component={Trends} />
      <Route exact path="/labs" component={Labs} />
      <Route exact path="/labs/new" component={LabNew} />
      <Route exact path="/" render={() => <Redirect to="/home" />} />
    </IonRouterOutlet>
    <IonTabBar slot="bottom">
      <IonTabButton tab="home" href="/home"><IonIcon icon={home} /><IonLabel>Home</IonLabel></IonTabButton>
      <IonTabButton tab="episodes" href="/episodes"><IonIcon icon={layers} /><IonLabel>Episodes</IonLabel></IonTabButton>
      <IonTabButton tab="new" href="/new"><IonIcon icon={add} /><IonLabel>New</IonLabel></IonTabButton>
      <IonTabButton tab="timeline" href="/timeline"><IonIcon icon={pulse} /><IonLabel>Signals</IonLabel></IonTabButton>
      <IonTabButton tab="profile" href="/profile"><IonIcon icon={person} /><IonLabel>Profile</IonLabel></IonTabButton>
    </IonTabBar>
  </IonTabs>
);

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <IonApp>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route exact path="/login" component={Login} />
            <Route exact path="/onboarding" render={() => (getToken() ? <Onboarding /> : <Redirect to="/login" />)} />
            <Route render={() => (getToken() ? <Tabs /> : <Redirect to="/login" />)} />
          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    </MotionConfig>
  );
}
