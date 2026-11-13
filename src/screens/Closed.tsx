import type { Theme } from '../../shared/themes';
import { Block, Header } from '../components/ui';
import { useTheme } from '../lib/theme';

/** Screen 14: the event is over and its data is gone. */
export function Closed({ theme, title }: { theme: Theme; title?: string }) {
  useTheme(theme);
  return (
    <main className="screen">
      <Header title="C'est fini !" theme={theme} big strong />
      <div className="pad">
        <div className="bigemoji" aria-hidden="true">{theme.emoji}</div>
        <Block color="b3" narrow><p className="lead">{theme.farewell}</p></Block>
        <Block offset={2}>
          <p className="small">{title ? `« ${title} »` : 'Cet événement'} est terminé : toutes les données ont été supprimées.</p>
        </Block>
      </div>
    </main>
  );
}
