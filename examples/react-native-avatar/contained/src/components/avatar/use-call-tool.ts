import { useCallback, useRef } from 'react';
import {
  NavigationContainerRefWithCurrent,
  ParamListBase,
} from '@react-navigation/native';
import { periods, trainingSummary } from '../../data/training';
import { appStore } from '../../state/app-store';
import { workoutPlanBus } from '../workout-plan-bus';
import {
  destinations,
  isDestination,
  isPeriod,
  parseProposedPlan,
  PLAN_DECIDED_EVENT,
  PlanDecision,
  savedDecision,
  ToolCall,
} from './native-tools';

type Props = {
  injectJavascript: (script: string) => void;
  navigationRef: NavigationContainerRefWithCurrent<ParamListBase>;
};

const periodError = (period: string) =>
  `unknown period "${period}"; use ${periods.join(', ')}`;

export function useCallTool({ injectJavascript, navigationRef }: Props) {
  const respond = useCallback(
    (result: unknown) =>
      injectJavascript(`window.onToolResult?.(${JSON.stringify(result)})`),
    [injectJavascript],
  );

  // What the member did with the last plan sheet the agent opened; read by get_plan_result.
  const planDecision = useRef<PlanDecision>({ status: 'open' });
  const latestProposal = useRef(0);

  const tellAgent = useCallback(
    (text: string) =>
      injectJavascript(`window.onAgentText?.(${JSON.stringify(text)})`),
    [injectJavascript],
  );

  return useCallback(
    async ({ id, name, args }: ToolCall) => {
      console.log(`Avatar | Tool Call - ${name}`, args);

      switch (name) {
        case 'get_training_summary': {
          const period = args.period ?? 'last_week';

          if (!isPeriod(period)) {
            respond({ id, data: { ok: false, error: periodError(period) } });
            break;
          }

          respond({
            id,
            data: { ok: true, period, ...trainingSummary[period] },
          });
          break;
        }
        case 'go_to': {
          const { destination, period } = args;

          if (!isDestination(destination)) {
            respond({
              id,
              data: {
                ok: false,
                error: `unknown destination "${destination}"; use ${Object.keys(
                  destinations,
                ).join(', ')}`,
              },
            });
            break;
          }

          if (destination === 'progress' && period !== undefined) {
            if (!isPeriod(period)) {
              respond({ id, data: { ok: false, error: periodError(period) } });
              break;
            }

            appStore.setProgressPeriod(period);
          }

          navigationRef.navigate(destinations[destination]);

          respond({
            id,
            data: {
              ok: true,
              destination,
              ...(destination === 'progress' && {
                period: appStore.getState().progressPeriod,
              }),
            },
          });
          break;
        }
        case 'propose_workout_plan': {
          const parsed = parseProposedPlan(args);

          if ('error' in parsed) {
            respond({ id, data: { ok: false, error: parsed.error } });
            break;
          }

          // Opening a sheet settles the previous one (its onDismiss runs). Only the latest proposal may report a decision.
          const proposalId = ++latestProposal.current;
          const decide = (decision: PlanDecision, notify = true) => {
            if (proposalId !== latestProposal.current) {
              return;
            }

            planDecision.current = decision;

            if (notify) {
              tellAgent(PLAN_DECIDED_EVENT);
            }
          };

          planDecision.current = { status: 'open' };

          workoutPlanBus.open({
            plan: parsed.plan,
            suggested: true,
            onSave: (saved, edited) => decide(savedDecision(saved, edited)),
            // Backgrounding closes the sheet but is not a member decision: record it, do not wake the agent.
            onDismiss: reason =>
              decide({ status: 'dismissed' }, reason === 'member'),
          });

          // The tool does not wait for the member: answer as soon as the sheet is open so the agent can keep talking.
          respond({ id, data: { ok: true, opened: true } });
          break;
        }
        case 'get_plan_result': {
          respond({ id, data: { ok: true, ...planDecision.current } });
          break;
        }
        default: {
          respond({
            id,
            error: `Unknown native tool: ${(name as string) ?? 'undefined'}`,
          });
        }
      }
    },
    [respond, tellAgent, navigationRef],
  );
}
