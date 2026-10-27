"""
Returns and exchanges at the counter, against an earlier bill of the same showroom:

  return    the customer brings items back; they go back into stock and the money is refunded in cash
            (whatever the bill was paid with: a UPI or card payment is also refunded in cash)
  exchange  items come back and the customer takes other items on a new bill; the returned value comes off the
            new bill. If the new bill is bigger the customer pays the rest (any method); if it is smaller the
            difference is refunded in cash.

Each one gets a credit note number (CN-CHN/26-27/00003). Only what was on the bill, and not returned already,
can come back, within the admin's return window (Settings, 15 days by default).
"""
