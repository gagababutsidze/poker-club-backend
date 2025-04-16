import { conection, queryDatabase } from "./DBconnection.js";
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'url';
import jwt from 'jsonwebtoken';


const pokerLogic = ( wss ) => {
    let cards = 'SELECT * FROM card';
    const activePlayers = [];
    const tables = {};
    let playerName = null;
    let selectedPlayers = [];
    let pot = 0;
    let check = false;
    let dealerIndex = null
    let allCards = null
    let betToBeMade = 0
    let cents = 1000;
 
    function assignTable() {

        const playerNames = new Set();

        /*while (selectedPlayers.length < 4 && activePlayers.length > 0) {
            const randomIndex = Math.floor(Math.random() * activePlayers.length);
            const player = activePlayers.splice(randomIndex, 1)[0];

            if (player && player.ws && !playerNames.has(player.playerName)) {
                selectedPlayers.push(player);
                playerNames.add(player.playerName);
            }
        }*/

        if (selectedPlayers.length === 4) {
            const newTableId = uuidv4();
            tables[newTableId] = {
                players : [],
                commonCards : []
            }
            tables[newTableId].players = selectedPlayers;

            selectedPlayers.forEach(player => {
                player.ws.tableId = newTableId;
                player.ws.playerName = player.playerName
                player.ws.send(JSON.stringify({
                    tableId: newTableId,
                    ws:player.ws,
                    message: "You have joined a table with other players."
                }));
            });
            selectedPlayers = [];
              setTimeout(() => {
                for (let i = 0; i < activePlayers.length; i++) {
                    activePlayers[i].ws.send(JSON.stringify({activePlayers: selectedPlayers }))
                 }
              }, 1000)                     
           
            
        } else {
            console.error("Not enough unique players to form a table.");
        }
    }

    wss.on('connection', async (ws, req) => {
            console.log('client connected to /join path');

            const query = parse(req.url, true).query;
            const playername = query.playername

            const token = query.token;
           
          
            if (!token) {
                ws.send(JSON.stringify({error: 'token is missing!'}))
            }
          
            try {
              const decoded = jwt.verify(token, process.env.SECRET);
              ws.user = decoded; // გამოიყენე მომავალში ws.user.id ან ws.user.email
              console.log("✅ Authenticated user:", decoded);
            } catch (err) {
                console.log(err.name, err.message);
                
            
            }


            
            activePlayers.push({
                ws:ws,
                playerName: playername
            })

                            
            for (let i = 0; i < activePlayers.length; i++) {
                activePlayers[i].ws.send(JSON.stringify({activePlayers: selectedPlayers }))
             }
        

            ws.on('message', async (message) => {
                allCards = await queryDatabase(cards);
                const data = JSON.parse(message);
                const { action, tableId } = data;
                playerName = data.playerName;
         
                const usersQuery = 'SELECT * FROM users WHERE email = ?';
                if (action === 'joinGame') {
                    const findUser = await queryDatabase(usersQuery, [playerName]);
                    if (!findUser || findUser.length === 0) {
                        return ws.send(JSON.stringify({ error: "Invalid user" }));
                    }
                    const newPlayer =  selectedPlayers.find(player => player.playerName === playerName);
                    if (newPlayer) {
                        console.log('this player already in selected players!');
                        return
                    }


                     selectedPlayers.push({ 
                        ws,
                         playerName: findUser[0].email, 
                         coins: cents, 
                         image: findUser[0].img,
                          active: true ,
                          hasBeenActed : false,
                          moveIsMade: false
                    });
                
                        
                    for (let i = 0; i < activePlayers.length; i++) {
                    activePlayers[i].ws.send(JSON.stringify({activePlayers: selectedPlayers }))
                
            
                    }
            
                    if (selectedPlayers.length === 4) {
                        assignTable();
   
                    } else {
                        ws.send(JSON.stringify({ message: "Waiting for more players..." }));
                    
                    }
                }


                if (action === 'leave-line') {
                    console.log('hello');
                    
                    const actualPlayer =  selectedPlayers.findIndex(player => player.playerName === playerName);
                   
                        selectedPlayers.splice(actualPlayer, 1)
                        for (let i = 0; i < activePlayers.length; i++) {
                            activePlayers[i].ws.send(JSON.stringify({activePlayers: selectedPlayers }))
                        }
                    
                  
                }

         })
            ws.on('close', () => {
                console.log(`client ${ws.playerName} discennected`);
               
            })

         ws.on('message', async (message) => {
        const data = JSON.parse(message);
        pot = 0;
        const { action, tableId } = data;
        playerName = data.playerName;
       const broadcast = (message) => {
     tables[tableId].players.forEach((user) => {
        user.ws.send(message)
        })

            }
        if (action === 'playGame') {
            setTimeout(() => {
                const tablePlayers = tables[tableId];
                if (tablePlayers) {
                   if (!tables[tableId].dealerAssigned) {
                        tablePlayers.dealerIndex =  Math.floor(Math.random() * tablePlayers.players.length);
                       const dealer = tablePlayers.players[tablePlayers.dealerIndex];
                       dealer.dealer = true;
                       tables[tableId].dealer = dealer;
                       tables[tableId].dealerAssigned = true;
    
                   }

                    tables[tableId].pot = pot;
                    tables[tableId].betToBeMade = betToBeMade
                    tables[tableId].currentBettingRound = 1
          
            
                   ws.send(JSON.stringify({
                       message: "users",
                       players: tablePlayers.players.map(p => ({
                           playerName: p.playerName,
                           playerCoin: p.coins,
                           image: p.image || 'https://example.com/default-avatar.jpg'
                       })),
                       dealer: tables[tableId].dealer.playerName,
                       pot: tables[tableId].pot,
                      
                   }));
           
                }
            },2000) 
     }


     const MAX_RETRIES = 5;
     const INITIAL_DELAY = 1000; // 1-second initial delay
 
     function checkConnectionAndSend(player, retries = 0, delay = INITIAL_DELAY) {

       // setTimeout(() => {
            if (retries > MAX_RETRIES) {
                console.log(`Failed to notify ${player.playerName} as the small blind after multiple attempts.`);
                return;
                }
     
                if (player.ws) {
                    player.ws.send(JSON.stringify({ action: 'set-small-blind' }));
                    console.log(`Message sent to ${player.playerName} for small blind assignment.`);
                    } else if (!player.ws) {
             
                        console.log(`Connection to ${player.playerName} is closed. No more retries.`);
                 } else {
                     setTimeout(() => checkConnectionAndSend(player, retries + 1, delay * 2), delay);
                    }
      //  }, 2000)

        }

        // Inside the 'set-blind' action
      if (action === 'set-blinds') {
        setInterval( async ()  => {
            const tablePlayers = tables[tableId];

            // Validate table state
            if (!tablePlayers || tablePlayers.players.length !== 4) {
             console.log("Invalid table state or insufficient players.");
             return;
            }
    
         // Update WebSocket reference for the current player
         const playerEntry = tablePlayers.players.find(player => player.playerName === playerName);
         let test = false
         if (playerEntry) {
       
            test = true
         }
         if (test) {
                if (tablePlayers.dealerAssigned && !tablePlayers.blindsSet) {
                const dealerPlayer = tablePlayers.players.find(player => player.dealer === true);
                if (!dealerPlayer) {
                    console.log("No dealer assigned.");
                    return;
                }
                    console.log('blinds are setting');
                    
                // Lock blinds to prevent duplicate actions
                tablePlayers.blindsSet = true;
        
                // Calculate indexes for small blind and big blind players
                tablePlayers.dealerIndex = tablePlayers.players.indexOf(dealerPlayer);
                const smallBlindIndex = (tablePlayers.dealerIndex - 1 + tablePlayers.players.length) % tablePlayers.players.length;
                const bigBlindIndex = (tablePlayers.dealerIndex - 2 + tablePlayers.players.length) % tablePlayers.players.length;  // Second next player for big blind
        
                const smallBlindPlayer = tablePlayers.players[smallBlindIndex];
                const bigBlindPlayer = tablePlayers.players[bigBlindIndex];
        
                try {
                    // Assign blinds
                    const smallBlindResult = await queryDatabase('SELECT * FROM users WHERE email = ?', smallBlindPlayer.playerName);
                    const bigBlindResult = await queryDatabase('SELECT * FROM users WHERE email = ?', bigBlindPlayer.playerName);
        
                    if (smallBlindResult !== 0 && bigBlindResult !== 0) {
                        console.log(`Small blind: ${smallBlindPlayer.playerName}, Big blind: ${bigBlindPlayer.playerName}`);
                        
                        smallBlindPlayer.coins =   smallBlindPlayer.coins - 10 ;
                        bigBlindPlayer.coins =  bigBlindPlayer.coins -20;
    
                        console.log(smallBlindPlayer.coins,   bigBlindPlayer.coins);
                        
                        // Send blind assignments
                        checkConnectionAndSend(smallBlindPlayer, { action: 'setSmallBlind', amount: 10 });
                        checkConnectionAndSend(bigBlindPlayer, { action: 'setBigBlind', amount: 20 });
    
                        let smallBlindAmount = 10;
    
                        let bigBlindAmount = 20
                        tablePlayers.betToBeMade = bigBlindAmount
        
                        // Update pot (only once after all validations pass)
                        const blindAmount = smallBlindAmount + bigBlindAmount; // Small blind + Big blind
                        tablePlayers.pot += blindAmount;
                        console.log(`Pot updated to: ${pot}`);
                        
        
                        // Broadcast updated pot
                        broadcast(JSON.stringify({ action: "updatePot", pot: tablePlayers.pot  }));
    
                        console.log('pot have been sent');
                        
                    } else {
                        console.log("Error finding blind players in the database.");
                      }
                } catch (error) {
                    console.log("Error during blind assignment:", error);
                }
            } 
         }
        }, 2000)
   

     // Ensure dealer is assigned and blinds are not already set
  
     }
 
     if (action === 'pre-flop') {
        const tablePlayers = tables[tableId];
    
        if (!tablePlayers) {
            ws.send(JSON.stringify({ message: "Invalid table ID." }));
            return;
        }
    
        // ✅ Prevent multiple pre-flop triggers
        if (tablePlayers.preFlop ) {
            console.log("❌ Pre-flop already happened.");
            console.log('current round', tableId , tablePlayers.currentBettingRound);
            
            return;
        }
    
        try {
            if (allCards.length < tablePlayers.players.length * 2) {
                console.log("Not enough cards to deal.");
                ws.send(JSON.stringify({ message: "Not enough cards to deal." }));
                return;
            }
    
            const usedIndexes = new Set();

            tablePlayers.usedCards = []
    
            tablePlayers.players.forEach(player => {
                let randomIndex1, randomIndex2;
    
                do {
                    randomIndex1 = Math.floor(Math.random() * allCards.length);
                } while (usedIndexes.has(randomIndex1) && tablePlayers.usedCards.includes(randomIndex1));
                usedIndexes.add(randomIndex1);
                tablePlayers.usedCards.push(randomIndex1)
                do {
                    randomIndex2 = Math.floor(Math.random() * allCards.length);
                } while (usedIndexes.has(randomIndex2) && tablePlayers.usedCards.includes(randomIndex2));
                usedIndexes.add(randomIndex2);
                tablePlayers.usedCards.push(randomIndex2)
    
                player.holeCards = [allCards[randomIndex1], allCards[randomIndex2]];
    
                console.log(`${player.playerName} received:`, player.holeCards);
    setTimeout(() => {
        player.ws.send(JSON.stringify({
            action: "pre-flop",
            playerName: player.playerName,
            holeCards: player.holeCards
        }));
    }, 3000)
                // ✅ Send cards only to the respective player
                check =true
           
            });
    
            console.log("✅ Pre-flop cards have been sent to all players.");
            tablePlayers.currentBettingRound = 1;
            console.log("current betting round",tablePlayers.currentBettingRound);
            
            tablePlayers.preFlop = true // Move to first betting round
        } catch (error) {
            console.error("❌ Error during pre-flop:", error);
            ws.send(JSON.stringify({ message: "An error occurred while dealing cards." }));
        }
    }
    

         
        
        let currentPlayer = null





        const handlePlayerAction = (tableId, playerName, action, message) => {
            const tablePlayers = tables[tableId];
          
            
            const actualPlayer =  tablePlayers.players.find(player => player.playerName === playerName);
            if (action === 'fold') {
                actualPlayer.active = false
                actualPlayer.moveIsMade = true                
                broadcast(JSON.stringify({message:`${actualPlayer.playerName} have been folded`}))
            }

            else if (action === 'call') {
               tablePlayers.pot = tablePlayers.pot + tablePlayers.betToBeMade;    
               if (!(actualPlayer.hasBeenActed)) {
                broadcast(JSON.stringify({action: 'called pot', pot: tablePlayers.pot}))
                actualPlayer.hasBeenActed = true
                actualPlayer.moveIsMade = true
                broadcast(JSON.stringify({message:`${actualPlayer.playerName} have been called`}))
               }
               else{
                console.log('gaga');
                
               }
              
            }

            else if (action === 'raise') {
                tablePlayers.players.map((user) => {
                    user.hasBeenActed = false;
                    user.moveIsMade = false
                })
                tablePlayers.betToBeMade = message.raiseAmount;
                console.log('raise amount' + message.raiseAmount);
                

                tablePlayers.pot = tablePlayers.pot + tablePlayers.betToBeMade;  
                console.log('pot' + tablePlayers.pot);
                 
                actualPlayer.hasBeenActed = true
                actualPlayer.moveIsMade = true

                broadcast(
                    JSON.stringify({
                        action: "updatePot",
                        pot: tablePlayers.pot,
                        message: `The pot is now ${tablePlayers.pot}.`,
                    })
                );
            }

            if (action === 'check') {
                actualPlayer.check = true;
                actualPlayer.moveIsMade = true;
                actualPlayer.hasBeenActed = true;
                console.log('cheki moxda');
                
            }

         
        }

        function managePlayerSequence(tableId) {
            const table = tables[tableId];
        
            if (!table || table.players.length !== 4) {
                console.log("Invalid table state or insufficient players.");
                return;
            }
        
            console.log(`👉 Current Turn Index: ${table.currentTurnIndex}`);
            console.log(`🧑‍💻 Active Players: ${table.players.filter(p => !p.moveIsMade).length}`);
        
            // დავადგენთ, ვინ არის ამჟამინდელი მოთამაშე
            if (!table.currentTurnIndex ) {
                table.currentTurnIndex = (table.dealerIndex - 3 + table.players.length) % table.players.length;
            }
        
            let currentPlayer = table.players[table.currentTurnIndex];
            console.log(`🎲 Current Player: ${currentPlayer.playerName}`);
            console.log(`🎲 dealer index: ${table.dealerIndex}`);
        
            // ვამოწმებთ, არის თუ არა მოთამაშე ონლაინ
            if (currentPlayer.ws ) {
                currentPlayer.ws.send(JSON.stringify({
                    action: "yourTurn",
                    currentPlayer: currentPlayer.playerName,
                    message: "It's your turn to choose an action.",
                    options: ["call", "fold", "raise"]
                }));
                console.log(`📢 Notified ${currentPlayer.playerName} of their turn.`);
            } else {
                console.log(`❌ Player ${currentPlayer.playerName} is disconnected.`);
                return;
            }
        
            // ვამატებთ მხოლოდ ერთ ლისენერს
            if (!currentPlayer.listenerAttached) {
                currentPlayer.listenerAttached = true;
        
                currentPlayer.ws.on("message", (data) => {
                    const message = JSON.parse(data);
                    console.log("💬 Received message:", message);
        
                    if (message.playerName !== currentPlayer.playerName) {
                        console.log("❗ Not your turn.");
                        return;
                    }
        
                    // ვამუშავებთ მოქმედებებს
                    if (message.action === "call") {
                        if (table.betToBeMade === 0) {
                            console.log('you cant call ');
                            managePlayerSequence(tableId)
                            return
                            
                        }
                        console.log('bet round' ,table.currentBettingRound);
                        
                        handlePlayerAction(tableId, currentPlayer.playerName, "call", message);
                        console.log(`${currentPlayer.playerName} called.`);
                        processNextTurn(tableId);
                    } 
                    else if (message.action === "fold") {
                        handlePlayerAction(tableId, currentPlayer.playerName, "fold", message);
                        console.log(`${currentPlayer.playerName} folded.`);
                        processNextTurn(tableId);
                    } 
                    else if (message.action === "raise") {
                        handlePlayerAction(tableId, currentPlayer.playerName, "raise", message);
                        console.log(`${currentPlayer.playerName} raised.`);
                        processNextTurn(tableId);
                    }

                    else if (message.action === 'check') {
                        if (table.betToBeMade === 0) {
                            handlePlayerAction(tableId, currentPlayer.playerName, "check", message);
                           processNextTurn(tableId)
                        
                        }
                        else{

                            console.log('bet is more than 0');
                            
                        }
                    }

                    // ამოწმებს, დასრულდა თუ არა რაუნდი
                    if (table.players.every(player => player.moveIsMade) && table.currentBettingRound === 1) {
                        console.log("✅ First betting round is over.");
                        table.currentBettingRound++
                        table.firstBetRound = true
                        flop(tableId)
                    }
                    else if (table.currentBettingRound === 2 && table.players.every(player => player.moveIsMade)) {
                        console.log('✅ second betting round is over.');
                        table.currentBettingRound++
                        turn(tableId)
                    }
                    else if (table.currentBettingRound === 3 && table.players.every(player => player.moveIsMade)) {
                        console.log('✅ third betting round is over.');
                        river(tableId)
                        table.currentBettingRound++
                        
                    }
                    else if (table.currentBettingRound === 4 && table.players.every(player => player.moveIsMade)) {
                        console.log('✅ fourth betting round is over.');
                        
                        showdown(tableId)
                    }

        
                    // ამოწმებს, თუ დარჩა მხოლოდ ერთი აქტიური მოთამაშე
                    if (table.players.filter(p => p.active).length === 1) {
                        const winner = table.players.find(player => player.active === true);
                        console.log(`🏆 Winner is: ${winner.playerName}`);
                        return;
                    }
                });
            }
        }

        function processNextTurn(tableId) {
            const table = tables[tableId];
        
            function nextTurn() {
                table.currentTurnIndex = (table.currentTurnIndex - 1 + table.players.length) % table.players.length;
        
                if (!table.players[table.currentTurnIndex].active || table.players[table.currentTurnIndex].hasBeenActed) {
                    setImmediate(nextTurn); // გადართვა შემდეგ მოთამაშეზე ისე, რომ არ დაბლოკოს სერვერი
                } else {
                    managePlayerSequence(tableId);
                }
            }
        
            setImmediate(nextTurn);
        }

         if (check) {
            setTimeout(() => {
                managePlayerSequence(tableId);    
            }, 1000) 
         }

        async function flop(tableId) {
            const table = tables[tableId];
        
            if (!table.flop) {
                table.flop = true;
                let random;

                for (let index = 0; index < 3; index++) {
                    do {
                        random = Math.floor(Math.random() * allCards?.length);
                    } while (table.usedCards.includes(random));
                   
                    table.usedCards.push(random)
                     console.log(random);
                     const randomCard = allCards[random];
                    console.log('randomCard: ' + randomCard.image_path);
                    table.commonCards.push(randomCard);
                    console.log('random index: ' + random);
                }

            table.players.forEach((user) => {

                    if (user.ws) {
                        user.ws.send(JSON.stringify({
                            action: 'flop',
                            flopCards: table.commonCards
                        }));
                            console.log('Flop has been sent to ' + user.playerName);
                    }   else {
                        console.log(user.playerName + ' is not connected');
                        }
                    });

                table.players.forEach(player => {
                    player.moveIsMade = false;
                    player.hasBeenActed = false;
                });
            
                table.betToBeMade = 0;


                managePlayerSequence(tableId)
            }

          
        }


        async function turn(tableId) {
            const table = tables[tableId];

            let random;

                do {
                    random = Math.floor(Math.random() * allCards?.length);
                } while (table.usedCards.includes(random));
               
                table.usedCards.push(random)
            const getCard = allCards[random]
            table.commonCards.push(getCard)
            table.players.forEach((user) => {
                user.ws.send(JSON.stringify({
                    action: 'turn',
                    turnCards: table.commonCards

                }))
            })

            table.players.forEach(player => {
                player.moveIsMade = false;
                player.hasBeenActed = false;
            });
            table.betToBeMade = 0;

            managePlayerSequence(tableId)

        }


        function river(tableId) {
            const table = tables[tableId];
        
            if (!table) {
                console.log("Table not found.");
                return;
            }
        
            // Make sure the Turn round has finished
            if (table.currentBettingRound !== 3) {
                console.log("Turn round is not complete yet.");
                return;
            }

            let random;

            do {
                random = Math.floor(Math.random() * allCards?.length);
            } while (table.usedCards.includes(random));
           
            table.usedCards.push(random)

            const getCard = allCards[random]
            table.commonCards.push(getCard)
        

            // Notify all players
            broadcast(
                JSON.stringify({
                    action: "river",
                    riverCard: table.commonCards,
                    message: "🔥 The River card has been revealed!",
                })
            );

            table.players.forEach(player => {
                player.moveIsMade = false;
                player.hasBeenActed = false;
            });
        
            table.betToBeMade = 0;

            managePlayerSequence(tableId)
        
    
        }

        function getCardValue(rank) {
    const values = { 
        "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, 
        "J": 11, "Q": 12, "K": 13, "A": 14 
    };
    return values[rank] || 0; // Default to 0 if rank is invalid
}



        const pokerHandRanks = [
            "High Card", "One Pair", "Two Pair", "Three of a Kind",
            "Straight", "Flush", "Full House", "Four of a Kind",
            "Straight Flush", "Royal Flush"
        ];


        function evaluateHand(cards) {
    // Sort by value
    cards.sort((a, b) => getCardValue(b.symbol) - getCardValue(a.symbol));

    const values = cards.map(card => getCardValue(card.symbol));
    const suits = cards.map(card => card.suit);

    // Count occurrences of each rank
    const valueCount = values.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});

    // Count occurrences of each suit
    const suitCount = suits.reduce((acc, suit) => {
        acc[suit] = (acc[suit] || 0) + 1;
        return acc;
    }, {});

    const isFlush = Object.values(suitCount).some(count => count >= 5);
    const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
    
    // Check for Straight
    let isStraight = false;
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (
            uniqueValues[i] - uniqueValues[i + 1] === 1 &&
            uniqueValues[i + 1] - uniqueValues[i + 2] === 1 &&
            uniqueValues[i + 2] - uniqueValues[i + 3] === 1 &&
            uniqueValues[i + 3] - uniqueValues[i + 4] === 1
        ) {
            isStraight = true;
            break;
        }
    }

    // Check for Royal Flush
    const isRoyal = isFlush && isStraight && values.includes(14) && values.includes(10);

    if (isRoyal) return { rank: "Royal Flush", value: 9 };
    if (isFlush && isStraight) return { rank: "Straight Flush", value: 8 };
    if (Object.values(valueCount).includes(4)) return { rank: "Four of a Kind", value: 7 };
    if (Object.values(valueCount).includes(3) && Object.values(valueCount).includes(2)) return { rank: "Full House", value: 6 };
    if (isFlush) return { rank: "Flush", value: 5 };
    if (isStraight) return { rank: "Straight", value: 4 };
    if (Object.values(valueCount).includes(3)) return { rank: "Three of a Kind", value: 3 };
    if (Object.values(valueCount).filter(count => count === 2).length === 2) return { rank: "Two Pair", value: 2 };
    if (Object.values(valueCount).includes(2)) return { rank: "One Pair", value: 1 };
    
    return { rank: "High Card", value: 0 };
}

        
       
   const showdown = (tableId) => {
    const table = tables[tableId];
    if (!table) {
        console.log("Invalid table ID");
        return;
    }

    const activePlayers = table.players.filter(player => !player.hasFolded);
    const communityCards = table.commonCards;

    if (activePlayers.length === 1) {
        // Only one player left, they win automatically
        const winner = activePlayers[0];
        distributePot(tableId, [winner]);  // Pass winner inside an array
        console.log(`${winner.playerName} wins the pot!`);
        return;
    }

    // Evaluate all players' hands
    let bestHandRank = -1;
    let winners = [];

    activePlayers.forEach(player => {
        const fullHand = [...player.holeCards, ...communityCards];
        const handRank = evaluateHand(fullHand);

        player.bestHand = handRank; // Store the evaluated hand

        if (handRank.value > bestHandRank) {
            bestHandRank = handRank.value;
            winners = [player]; // Reset winners with a new best hand
        } else if (handRank.value === bestHandRank) {
            winners.push(player); // Tie case
        }
    });

    // Distribute pot among winners
    distributePot(tableId, winners);

    // Notify players of the showdown results
    const response = {
        action: "showdown",
        winners: winners.map(w => w.playerName),
        winningHands: winners.map(w => w.bestHand.rank) // Send only the rank, not the full object
    };
     console.log(tables[tableId]);
     


    table.players.forEach(player => player.ws.send(JSON.stringify(response)));

    console.log("Showdown Result:", response);
};


function compareHands(player1, player2) {
    const hand1 = evaluateHand(player1.fullHand);
    const hand2 = evaluateHand(player2.fullHand);

    if (hand1.value > hand2.value) return player1;
    if (hand1.value < hand2.value) return player2;

    // If hands are the same rank, compare high cards
    for (let i = 0; i < 5; i++) {
        const value1 = getCardValue(player1.fullHand[i].symbol);
        const value2 = getCardValue(player2.fullHand[i].symbol);
        if (value1 > value2) return player1;
        if (value1 < value2) return player2;
    }

    return "Tie";
}

function distributePot(tableId, winners) {
    const table = tables[tableId];
    if (!table) {
        console.log("Invalid table ID.");
        return;
    }

    if (winners.length === 0) {
        console.log("No winners found!");
        return;
    }

    // Split the pot evenly among winners
    let potShare = Math.floor(table.pot / winners.length);

    winners.forEach(winner => {
        winner.coins += potShare;
        console.log(`${winner.playerName} wins ${potShare} coins!`);
    });

    // Reset the pot
    table.pot = 0;

    // Broadcast to all players
    table.players.forEach(player => {
        player.ws.send(JSON.stringify({
            action: "pot_distributed",
            winners: winners.map(w => w.playerName),
            potShare
        }));
    });

    console.log(`Pot distributed. Each winner gets ${potShare} coins.`);
}


     })

    });
 
    
  
}


export default pokerLogic;




