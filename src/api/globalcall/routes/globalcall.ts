export default {
    routes:[
        {
            method: 'GET',
            path: '/globalcall/counters',
            handler: 'globalcall.getCounters',
        },
        {
            method: 'GET',
            path: '/globalcall/getLatestComments',
            handler: 'globalcall.getLatestComments',
        }
    ]
}