"""
The daily cash close: at the end of the day a showroom counts the cash in its drawer, and the difference against
what the bills say should be there is kept for the admin.

  expected   = opening float + cash from bills (cash, and the cash part of split payments)
               - cash refunds (returns, and exchanges that gave money back)
  difference = counted - expected        (below 0: cash short, above 0: cash over)

The opening float starts from what the showroom kept in the drawer at its last close.
"""
