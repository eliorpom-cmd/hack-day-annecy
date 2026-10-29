-- How clients reach the répondeur (setup step « Votre numéro »):
-- 'renvoi' = the artisan keeps his own number and forwards unanswered / declined / unreachable calls
--            to the répondeur number (**61*, **67*, **62*): his phone already rang, the agent answers at once;
-- 'numero' = clients call the répondeur number, which rings the artisan first.
-- NULL = not chosen yet, routed like 'numero'.
ALTER TABLE businesses ADD COLUMN forwarding_mode TEXT CHECK (forwarding_mode IN ('renvoi', 'numero'));
