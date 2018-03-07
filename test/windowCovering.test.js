const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const ping = require('./helpers/fakePing')
const FakeServiceManager = require('./helpers/fakeServiceManager')

const delayForDuration = require('../helpers/delayForDuration')
const { getDevice } = require('../helpers/getDevice')

const { WindowCovering } = require('../accessories')

const data = {
  open: 'OPEN',
  close: 'CLOSE',
  stop: 'STOP',
//   openCompletely: 'OPEN_COMPLETELY',
//   closeCompletely: 'CLOSE_COMPLETELY',
};

// TODO: Check cancellation of timeouts

describe('windowCoveringAccessory', () => {

  it ('default config', async () => {
    const { device } = setup();

    const config = {
      data,
      persistState: false,
      host: device.host.address
    }
    
    const switchAccessory = new WindowCovering(null, config, 'FakeServiceManager');
    
    expect(switchAccessory.config.initialDelay).to.equal(0.1);
    expect(switchAccessory.config.totalDurationOpen).to.equal(45);
    expect(switchAccessory.config.totalDurationClose).to.equal(45);
  })

  it ('custom config', async () => {
    const { device } = setup();

    const config = {
      data,
      initialDelay: 0.5,
      totalDurationOpen: 5,
      totalDurationClose: 5,
      persistState: false,
      host: device.host.address
    }
    
    const switchAccessory = new WindowCovering(null, config, 'FakeServiceManager');
    
    expect(switchAccessory.config.initialDelay).to.equal(0.5);
    expect(switchAccessory.config.totalDurationOpen).to.equal(5);
    expect(switchAccessory.config.totalDurationClose).to.equal(5);
  })

  it ('determineOpenCloseDurationPerPercent', async () => {
    const { device } = setup();

    const config = {
      data,
      persistState: false,
      host: device.host.address
    };
    
    const switchAccessory = new WindowCovering(null, config, 'FakeServiceManager');

    const totalDurationOpen = 5;
    const totalDurationClose = 8;

    const openDurationPerPercent = switchAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen,
      totalDurationClose
    });

    expect(openDurationPerPercent).to.equal(totalDurationOpen / 100);

    const closeDurationPerPercent = switchAccessory.determineOpenCloseDurationPerPercent({
      opening: false,
      totalDurationOpen,
      totalDurationClose
    });

    expect(closeDurationPerPercent).to.equal(totalDurationClose / 100);
  })

  // Open blinds to 50%
  it('0% -> 50%', async () => {
    const { device } = setup();

    const config = {
      data,
      totalDurationOpen: 5, 
      persistState: false,
      host: device.host.address
    }
    
    const switchAccessory = new WindowCovering(null, config, 'FakeServiceManager')

    const durationPerPercent = switchAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });

    // Set Blinds to 50%
    switchAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 50)

    // Wait for initialDelay
    await delayForDuration(switchAccessory.config.initialDelay);
    expect(switchAccessory.state.currentPosition).to.equal(0);

    // Check value at 50%
    await delayForDuration(50 * durationPerPercent);
    expect(switchAccessory.state.currentPosition).to.equal(50);

    // Check hex code was sent
    const hasSentCodes = device.hasSentCodes([ 'OPEN', 'STOP' ]);
    expect(hasSentCodes).to.equal(true);

    // Check the number of sent codes
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(2);
  }).timeout(6000);


  // Open blinds to 20% then 50%
  it('0% -> 20% -> 50%', async () => {
    const { device } = setup();

    const config = {
      data,
      totalDurationOpen: 5, 
      persistState: false,
      host: device.host.address
    }
    
    const switchAccessory = new WindowCovering(null, config, 'FakeServiceManager')

    const durationPerPercent = switchAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });

    // Set blinds to 20%
    switchAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 20)

    // Wait for initialDelay
    await delayForDuration(switchAccessory.config.initialDelay);
    expect(switchAccessory.state.currentPosition).to.equal(0);

    // Check value at 20%
    await delayForDuration(20 * durationPerPercent);
    expect(switchAccessory.state.currentPosition).to.equal(20);

    // Set blinds to 50%
    switchAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 50)

    // Wait for initialDelay
    await delayForDuration(switchAccessory.config.initialDelay);
    expect(switchAccessory.state.currentPosition).to.equal(20);

    // Check value at 50%
    await delayForDuration(50 * durationPerPercent);
    expect(switchAccessory.state.currentPosition).to.equal(50);

    // Check hex code was sent
    const hasSentCodes = device.hasSentCodes([ 'OPEN', 'STOP' ]);
    expect(hasSentCodes).to.equal(true);

    // Check the number of sent codes
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(4);
  }).timeout(6000);


  // Open blinds to 90% then close to 50%
  it('0% -> 90% -> 60%', async () => {
    const { device } = setup();

    const config = {
      data,
      totalDurationOpen: 5, 
      totalDurationClose: 3, 
      persistState: false,
      host: device.host.address
    }
    
    const switchAccessory = new WindowCovering(null, config, 'FakeServiceManager')

    const openDurationPerPercent = switchAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });

    const closeDurationPerPercent = switchAccessory.determineOpenCloseDurationPerPercent({
      opening: false,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });

    // Set blinds to 90%
    switchAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 90)

    // Wait for initialDelay
    await delayForDuration(switchAccessory.config.initialDelay);
    expect(switchAccessory.state.currentPosition).to.equal(0);

    // Check value at 90%
    await delayForDuration(90 * openDurationPerPercent);
    expect(switchAccessory.state.currentPosition).to.equal(90);

    // Set blinds to 60%
    switchAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 60)

    // Wait for initialDelay
    await delayForDuration(switchAccessory.config.initialDelay);
    expect(switchAccessory.state.currentPosition).to.equal(90);

    // Check value at 60%
    await delayForDuration(30 * closeDurationPerPercent);
    expect(switchAccessory.state.currentPosition).to.equal(60);

    // Check hex code was sent
    const hasSentCodes = device.hasSentCodes([ 'OPEN', 'CLOSE', 'STOP' ]);
    expect(hasSentCodes).to.equal(true);

    // Check the number of sent codes
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(4);
  }).timeout(6000);

  // Test initialDelay
  it('"initialDelay": 1', async () => {
    const { device } = setup();
  
    const config = {
      data,
      initialDelay: 1,
      totalDurationOpen: 2, 
      persistState: false,
      host: device.host.address
    }
    
    const switchAccessory = new WindowCovering(null, config, 'FakeServiceManager')
  
    const durationPerPercent = switchAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });
  
    // Set Blinds to 10%
    switchAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 10)
  
    // Wait for initialDelay. Subtract .1 to allow for minor timeout discrepancies.
    await delayForDuration(switchAccessory.config.initialDelay - .1);
  
    // Ensure `initialDelay` has been taken into account by checking that no hex codes have
    // been sent yet.
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(0);
    
  }).timeout(6000);
  
})