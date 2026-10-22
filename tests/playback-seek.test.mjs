import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {createPlayback} from '../frontend/src/features/playback/index.js';
test('timeline seek stops the existing timer and broadcasts the original snapshot once',async()=>{
 const steps=[{id:0},{id:1},{id:2}],events=[];
 const player=createPlayback({runId:'real-run',steps,intervalMs:20,onStepChange:s=>events.push(s)});
 try {
  player.play();const count=events.length;player.seek(2);
  assert.equal(events.length,count+1);assert.equal(events.at(-1).step,steps[2]);assert.equal(events.at(-1).runId,'real-run');
  assert.equal(events.at(-1).playing,false);assert.equal(player.getDiagnostics().activeTimers,0);
  const stopped=events.length;await delay(60);assert.equal(events.length,stopped);
  player.seek(0);assert.equal(events.at(-1).step,steps[0]);assert.equal(player.getState().canPrev,false);
 } finally {player.destroy();}
});
test('invalid seeks preserve the pointer and destroyed players cannot broadcast',()=>{
 const events=[],player=createPlayback({steps:[{},{}],onStepChange:s=>events.push(s)});
 for(const index of [-1,2,0.5,'1',null,NaN])assert.throws(()=>player.seek(index));
 assert.equal(player.getState().stepIndex,0);assert.equal(events.length,0);
 player.destroy();player.seek(1);assert.equal(player.getState().stepIndex,0);assert.equal(events.length,0);
});
