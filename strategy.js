// "Whenever the last tick of the Random 100 Index is 9, then buy a $10-payout 5-tick digit bet that predicts that the last digit will not be 9".

var api = new LiveApi();

api.authorize('8PgmMxKGP0ARsRs');
api.subscribeToTicks('R_100');

api.events.on('tick', function(response) {
    if (response.tick.quote.slice(-1) == '9') {
        api.getPriceProposalForContract({
            basis: 'payout',
            amount: '10',
            currency: 'USD',
            symbol: 'R_100',
            contract_type: 'DIGITDIFF',
            barrier: 9,
            duration: 5,
            duration_unit: 't',
        });
    }
});

api.events.on('proposal', function(response) {
    api.buyContract(response.proposal.id, 10);
});

api.events.on('buy', function(response) {
    console.log('contract bought', response);
});
