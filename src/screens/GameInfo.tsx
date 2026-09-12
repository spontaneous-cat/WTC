import { View } from 'react-native';
import { ROLE_IDS, ROLES, type PublicGame } from '../../shared/contracts';
import { Body, Card, Title } from '../ui/components';

export function GameSettings({ game }: { game: PublicGame }) {
  return (
    <Card>
      <Title small>Game settings</Title>
      <Body muted>Read-only. Initial role composition is locked.</Body>
      <Body>Players: {game.setup.playerCount}</Body>
      {ROLE_IDS.map((role) => (
        <Body key={role}>
          {ROLES[role].name}: {game.setup.roles[role]}
        </Body>
      ))}
      <Body>Vote cooldown: {game.setup.timers.cooldown} seconds</Body>
      <Body>Discussion: {game.setup.timers.discussion} seconds</Body>
      <Body>Voting: {game.setup.timers.voting} seconds</Body>
      <Body>Grace period: {game.setup.timers.grace} seconds</Body>
      <Body>
        Visible live voting: {game.setup.visibleLiveVoting ? 'On' : 'Off'}
      </Body>
      <Body>
        Manual corrections:{' '}
        {game.setup.manualCorrectionsEnabled ? 'Enabled' : 'Disabled'}
      </Body>
    </Card>
  );
}

export function GameRules() {
  return (
    <Card>
      <Title small>Game rules</Title>
      <View style={{ gap: 10 }}>
        <Body>
          <Body bold>Roles:</Body> one Killer is evil; Minions support evil; the
          Collective is good; the Exile is neutral and wins if voted out.
        </Body>
        <Body>
          <Body bold>Win conditions:</Body> good wins by voting out the Killer.
          Evil wins when every non-evil player is killed or voted out. The Exile
          wins immediately when voted out.
        </Body>
        <Body>
          <Body bold>Kills and privacy:</Body> physical kills are reported and
          confirmed in the app. Confirmed deaths stay hidden publicly until the
          next vote starts; roles and teams stay private until game over.
        </Body>
        <Body>
          <Body bold>Nominations and voting:</Body> living players may nominate
          when no vote is active and cooldown allows it. Voting reveals current
          public statuses, uses one vote per eligible living voter, requires a
          majority, and ties cause no execution.
        </Body>
        <Body>
          <Body bold>Public history:</Body> the chronicle records only public
          events such as game start, nominations, vote results, executions,
          disputes, and game end.
        </Body>
      </View>
    </Card>
  );
}
