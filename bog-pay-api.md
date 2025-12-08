Aggregator Integration Protocol for E-Commerce Services
What is Online Payment API?
The Online Payment API is a robust, developer-friendly solution designed to integrate a secure payment module into any electronic system quickly and effortlessly. It streamlines payment processing, allowing business1 to receive payments using various payment methods, including cards from Bank of Georgia and other commercial banks (VISA, MasterCard, American Express).

Protocol and Technical Specifications
API Architecture: RESTful
Communication Protocol: HTTP/1.1 (All API calls must be made over HTTPS to ensure secure data transmission.)
Data Format: JSON is used for both request payloads and response bodies, facilitating easy integration.
Authentication & Security: OAuth 2.0 is used for authentication, while JSON Web Tokens (JWT) ensure secure data exchange.
Synchronous API Calls: Every API request is processed immediately, delivering a response that reflects the outcome of the API call.
Asynchronous Webhook Notifications: Although API calls are synchronous, key events, such as payment confirmations and updates, are managed asynchronously via Callbacks3 for reliable, real-time communication.
Error Handling: Standard HTTP status codes and descriptive error messages are used to indicate success or error states, helping developers quickly diagnose issues.
Checkout Process Overview
Customer Initiates Payment: The customer selects the desired product or service (or a combination in a shopping cart) on the business's website and clicks the payment button.
Business Sends an Order Request: The business sends an order request to the online payment API to initiate the operation, marking the beginning of the payment process.
API Returns Order Request Details: The payment gateway responds with the necessary parameters—such as an order request ID and a redirect URL—that enable the payment process to continue.
Customer is Redirected to the Online Payment Page: The business directs the customer to the online payment page2. Here, the customer chooses the payment method, enters their card details or uses internet banking to authorize the payment.
Payment Processing: The online payment system validates payment details and securely processes the payment.
Callback Notification Sent to Business: Once the transaction is processed, the payment gateway sends a Callback, to the business’s callback URL, provided in the order request.
note
Receiving the callback is a crucial step in the payment process. it confirms the payment status (successful or failed) and other essential details. Based on the information received in the callback, the business must ensure that its system is updated accordingly.

Operation Completion: After receiving the callback, the business finalizes the process by confirming the order to the customer and completing any related fulfillment activities.
note
Before redirecting to the online payments page, the business can use the card-saving feature to carry out future transactions automatically or without entering card details.

Authentication Method
What do I need to use the payment API?
To use the payment API, HTTP Basic Auth is required. You will need to know the unique credentials4 of your business to enter the system. These credentials consist of two parameters, client_id, and client_secret, used as the username and password for business authentication.

How to obtain the credentials for entering the business system?
Upon registering a company as a business in the banking system and providing all the necessary data, the system provides the credentials client_id and client_secret necessary to enter the system. These credentials are unique identifiers of the business. It is impermissible to disclose or transfer the client_secret parameter to another person. Doing so significantly increases the probability of a security breach. The business cannot change the client_secret parameter.

Method description
This method allows businesses to undergo the authentication process. Upon calling the API, the online payment server returns the Bearer Token, which is the necessary authentication parameter for calling all further methods.

Header parameters
Content-Type
required
application/x-www-form-urlencoded
Authorization
required
Basic <base64>
'Basic ' + '<client_id>:<secret_key>' encoded in the Base64 format is transmitted as a value (e.g., 'Basic ODI4Mjo3Njk3MDY0OTlmMDcwOWUyMzQ4NDU4NjNmOThiMjMxNA=='), where <client_id> and <secret_key> are the credentials necessary to enter the system, transmitted by the bank to the business.

Body parameters
grant_type
required
client_credentials
The fixed text client_credentials is transmitted as the value.

CURL
curl -X POST 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token' \
-u {client_id}:{client_secret} \
-H 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=client_credentials'

Response
access_token
string
The Token is returned by the authorization server.

token_type
string
The type of Token (fixed value – Bearer – is returned).

expires_in
number
The number of seconds while the Token is active.

RESPONSE
{
"access_token": "<JWT>",
"token_type": "Bearer",
"expires_in": 1634719923245
}

Order Request
To place an order request, businesses must send payment details, technical specifications, and the amount to be paid to the online payment server. If the process is successful, the customer should be redirected to the online payment page at the redirect address returned to the \_link parameter to complete the payment.

Header parameters
Content-Type
required
application/json
Authorization
required
Basic <base64>
Bearer <jwt_token>, where jwt_token is the token returned in the access_token parameter of the authentication method response.

Idempotency-Key
optional
UUID v4
The Idempotency-Key parameter should be unique for each new API request. Subsequent requests to the same API endpoint with the same Idempotency-Key header will result in the server returning the same status code and response body as the initial request. This functionality is particularly useful to ensure consistent outcome in scenarios where network issues or retries may lead to duplicate requests.

Accept-Language
optional
string
The language of the interface that the customer will see when redirected to the online payment page. The possible values are:

ka - Georgian (default)
en - English.
Theme
optional
string
The theme of the interface that the customer will see when redirected to the online payment page. The possible values are:

light - Light (default)
dark - Dark.
Body parameters
application_type
optional
"web" | "mobile"
Defines the type of application from which the order was created. This parameter is used specifically when an order is created using Apple Pay, directly from the merchant's webpage or mobile application. application_type has two values:

web - For orders created from a webpage.
mobile - For orders created from a mobile application.
buyer
optional
object
Information about the buyer.

buyer.full_name
optional
string
The buyer's name and surname.
buyer.masked_email
optional
string
The buyer's masked email address.
buyer.masked_phone
optional
string
The buyer's masked phone number.
callback_url
required
string
The web address of the business (must be HTTPS), which will be automatically called by the bank upon completion of the payment to provide the business with the payment details (via Callback).
external_order_id
optional
string
The payment identifier from the business system (e.g., the purchase basket identifier).
capture
optional
"automatic" | "manual"
The transaction type takes two values:
automatic - creation of a standard order, payment will be made without pre-authorization, and the amount will be immediately withdrawn from the customer’s account.
manual - after payment, the amount on the customer’s account will be blocked and will not be available for the customer. To complete the payment, it is necessary to use the pre-authorization completing method and confirm/reject the transaction. If this operation is not performed within 30 days, the amount will be automatically unblocked and will be available again for the customer. This feature can only be used when paying through Apple Pay, Google Pay or by a card.
purchase_units
required
object
The purchase information.

purchase_units.basket
required
array
A basket of products or services purchased within a given payment in a business.

purchase_units.basket[].product_id
required
string
The purchased product/service identifier in the business system.
purchase_units.basket[].description
optional
string
The name (description) of the purchased product/service.
purchase_units.basket[].quantity
required
number
The quantity (volume) of each product/service. The minimum value is 1.
purchase_units.basket[].unit_price
required
number
The purchased product/service unit price.
purchase_units.basket[].unit_discount_price
optional
number
The volume of the deducted amount on the product/service unit in case of discount payment.
purchase_units.basket[].vat
optional
number
The value added tax (VAT) of the purchased product/service.
purchase_units.basket[].vat_percent
optional
number
The percentage of value added tax (VAT) of the purchased product/service.
purchase_units.basket[].total_price
optional
number
The total price of the purchased product/service.
purchase_units.basket[].image
optional
string
The web address of the product/service image.
purchase_units.basket[].package_code
optional
string
The product code of the purchased product/service.
purchase_units.basket[].tin
optional
string
The taxpayer identification number (TIN).
purchase_units.basket[].pinfl
optional
string
The personal identification number of an individual (PINFL).
purchase_units.basket[].product_discount_id
optional
string
Product discount identifier. If a discount promotion is registered in the bank with the provided value, taking into account the terms of the discount, the corresponding promotion will be applied to the order.
purchase_units.delivery
optional
object
Information about the delivery service.

purchase_units.delivery.amount
optional
number
The delivery fee.
purchase_units.total_amount
required
number
The full amount is to be paid.
purchase_units.total_discount_amount
optional
number
The reduced amount in case of payment with a discount.
purchase_units.currency
optional
string
The currency in which payment is made:

GEL - Georgian Lari (default)
USD - US dollar
EUR - Euro
GBP - British pound.
redirect_urls
optional
object
The business web addresses that customers can be redirected to from the online payment system upon completion of the payment.

redirect_urls.success
optional
string
The web address in the case of successful completion of the transaction. If it is empty, the customer will remain on the online payments page and a corresponding receipt will be shown.
redirect_urls.fail
optional
string
The web address in the case of unsuccessful completion of the transaction. If it is empty, the customer will remain on the online payments page and a corresponding receipt will be shown.
ttl
optional
number
Specifies the duration of the order lifespan in minutes (the number of minutes a customer will be able to pay). The logic of this parameter can vary depending on the business's industry. The minimum value is 2 minutes, and the maximum is 1440 minutes (24 hours). If this parameter is left empty, the system defaults to 15 minutes.
payment_method
optional
array
The payment methods that a customer can use to pay for the order. The business must have all the methods it provides here activated. If the parameter is left empty, upon redirecting a customer to the online payment page, they will be able to use all the payment methods available for the business. The possible values are:

card - payment by a bank card
google_pay - payment through Google Pay and by a bank card (in the case of providing this option, the customer will be able to pay both by Google Pay and a bank card. The Business must have both payment methods activated)
apple_pay - payment through Apple Pay and by a bank card (in the case of providing this option, the customer will be able to pay both by Apple Pay and a bank card. The Business must have both payment methods activated)
bog_p2p - transferring by the BoG, internet, or mobile bank user
bog_loyalty - payment by the BoG MR/Plus points
bnpl - payment with Buy Now Pay Later plan
bog_loan - standard bank installment plan
gift_card - payment with a gift card
config
optional
object
Configuration of a specific payment.

config.loan
optional
object
Payment configuration. Transmission of a parameter is necessary if you wish the payment to be made only by installment plan ("payment_method":["bog_loan"]) or only by bnpl ("payment_method":["bnpl"]).

config.loan.type
optional
string
Discount code of the installment/bnpl (the value of the discount_code parameter returned by the calculator).
config.loan.month
optional
number
Duration of the installment/bnpl in months (the value of the month parameter returned by the calculator).
config.campaign
optional
object
Duration of the installment/bnpl in months (the value of the month parameter returned by the calculator).

config.campaign.card
optional
string
A card type, to which the discount applies to:

visa - Visa
mc - MasterCard
solo - SOLO card
config.campaign.type
optional
string
Discount type:
restrict - card type restriction
client_discount - discount on a specific card type
config.google_pay
optional
object
Payment configuration. Transmission of a parameter is necessary if you wish to make Google Pay payment from your own webpage.

config.google_pay.google_pay_token
optional
string
Full string representing the encrypted Google Pay payment details. It must include all nested fields as received from the Google Pay SDK without modification or truncation.
config.google_pay.external
optional
boolean
true - payment is initiated from the Google Pay button on business' webpage
false - Payment is initiated from the bank's webpage (default).
config.apple_pay
optional
object
Payment configuration. This parameter is necessary if you wish to enable Apple Pay payments from your own webpage.

config.apple_pay.external
optional
boolean
true -Payment is initiated from the Apple Pay button on the business's webpage.
false - Payment is initiated from the bank's webpage (default).
config.account
optional
object
Payment configuration: This object is necessary if you have configured multiple e-commerce POS terminals in the same currency. It allows you to group payments based on business needs or settle payments on different business bank accounts.

config.account.tag
optional
string
E-commerce POS identifier. If provided tag does not match with POS configuration or tag was not provided, the operation will default to the default POS terminal and its corresponding payment account. Note: It is important to agree upon tag values when configuring additional ecommerce POS terminal.

CURL
curl -X POST 'https://api.bog.ge/payments/v1/ecommerce/orders' \
-H 'Accept-Language: ka' \
-H 'Authorization: Bearer <token>' \
-H 'Content-Type: application/json' \
--data-raw '{
"callback_url": "https://example.com/callback",
"external_order_id": "id123",
"purchase_units": {
"currency": "GEL",
"total_amount": 1,
"basket": [
{
"quantity": 1,
"unit_price": 1,
"product_id": "product123"
}
]
},
"redirect_urls": {
"fail": "https://example.com/fail",
"success": "https://example.com/success"
}
}'

Response
id
string
Order identifier.
\_links
object
The web resource addresses are used in the further stages of the payment process. At the moment two resources are returned:

\_links.details.href
string
The address of the payment details can be used to obtain information on the online payment.
\_links.redirect.href
string
The web page address, which a customer shall be redirected to in order to enter a plastic card or online banking details and complete the process.
RESPONSE
{
"id": "{order_id}",
"\_links": {
"details": {
"href": "https://api.bog.ge/payments/v1/receipt/{order_id}"
},
"redirect": {
"href": "https://payment.bog.ge/?order_id={order_id}"
}
}
}

Payment Details
This method allows businesses to receive detailed information about an online payment using its identifier.

Header parameters
Authorization
required
Basic <base64>
The meaning Bearer <jwt_token> is transmitted, where jwt_token is the meaning returned to the access_token parameter of the Response method.

Path parameter
order_id
required
string
The order identifier returned to the online shop in the response of the create order request.
CURL
curl -X GET 'https://api.bog.ge/payments/v1/receipt/:order_id' \
-H 'Authorization: Bearer <token>'

Response
order_id
string
The online payment identifier.
industry
string
The business industry, defined during its registration.
capture
string
The authorization method, always - automatic. transaction type with two possible meanings:

automatic - a standard order
manual - a pre-authorization order
external_order_id
string
The payment identifier from the business system (e.g., a purchase basket identifier).
client
object
The business information.

client.id
string
The business identifier in the bank system.
client.brand_ka
string
The business Georgian name.
client.brand_en
string
The business English name.
client.url
string
The business web-site address.
zoned_create_date
string
The order creation date in Coordinated Universal Time ( UTC). It follows the format "YYYY-MM-DDTHH:MM:SS.ssssssZ".
zoned_expire_date
string
The order expiration date in Coordinated Universal Time (UTC). It follows the format "YYYY-MM-DDTHH:MM:SS.ssssssZ".
order_status
object
Order status.

order_status.key
string
The status gets the following meanings:

created - payment request is created
processing - payment is being processed
completed - payment process has been completed
rejected - payment process has been unsuccessfully completed
refund_requested - refund of the amount is requested
refunded - payment amount has been returned
refunded_partially - payment amount has been partially refunded
auth_requested - pre-authorize payment is requested
blocked - pre-authorize payment has been completed successfully, but payment amount is blocked and waiting for confirmation
partial_completed - pre-authorize payment partial amount has been confirmed successfully
order_status.value
string
Description.
buyer
object
The buyer information.

buyer.full_name
string
The buyer's full name.
buyer.email
string
The buyer's email.
buyer.phone_number
string
The buyer's phone number.
purchase_units
object
Information on the purchased products.

purchase_units.request_amount
string
The requested amount of the order.
purchase_units.transfer_amount
string
The processed amount of the order.
purchase_units.refund_amount
string
The refunded amount.
purchase_units.currency_code
string
Currency.
purchase_units.items
array
The list of the purchased products/services.

purchase_units.items[].external_item_id
string
The purchased product/service identifier in the business system.
purchase_units.items[].description
string
The name (description) of the purchased product/service.
purchase_units.items[].quantity
string
The quantity (volume) of each product/service.
purchase_units.items[].unit_price
string
The purchased product/service unit price.
purchase_units.items[].unit_discount_price
string
The volume of the deducted amount on the product/service unit in case of discount payment.
purchase_units.items[].vat
string
The value added tax (VAT) of the purchased product/service.
purchase_units.items[].vat_percent
string
The percentage of value added tax (VAT) of the purchased product/service.
purchase_units.items[].total_price
string
The total price of the purchased product/service.
purchase_units.items[].package_code
string
The product code of the purchased product/service.
purchase_units.items[].tin
string
The taxpayer identification number (TIN).
purchase_units.items[].pinfl
string
The personal identification number of an individual (PINFL).
purchase_units.basket[].product_discount_id
optional
string
Product discount identifier. If a discount promotion is registered in the bank with the provided value, taking into account the terms of the discount, the corresponding promotion will be applied to the order.
redirect_links
object
The business web-pages, to which customers can be re-directed from the online payment system upon completion of the transaction.

redirect_links.fail
string
The web-address in the case of transaction failure.
redirect_links.success
string
The web-address in the case of transaction success.
payment_detail
object
Payment details.

payment_detail.transfer_method
string
Payment method.

payment_detail.transfer_method.key
string
The payment method gets the following meanings:
card - payment by a bank card
google_pay - payment through Google Pay
apple_pay - payment through Apple Pay
bog_p2p - transferring by a customer of the Bank of Georgia, internet or mobile banking
bog_loyalty - payment by BoG MR/Plus points
bnpl - payment in installments
bog_loan - standard bank installment plan.
payment_detail.transfer_method.value
string
Description.
payment_detail.transaction_id
string
Transaction identifier.
payment_detail.payer_identifier
string
A payer's identifier, according to the transfer_method, gets various meanings:

card/google_pay – the card’s encoded number is returned (PAN)5
apple_pay – a device-specific number assigned to your card by Apple is returned
bog_p2p/bog_loyalty – the account name is returned
bog_loan/bnpl – the first letter of a customer name is returned.
payment_detail.payment_option
string
Payment method. The following values can be returned:

direct_debit - card payment
recurrent - payment by the saved card
subscription - automatic payment by the saved card.
payment_detail.card_type
string
The type of card used for payment. The parameter takes its value during the card payment:

amex - American Express
mc - Mastercard
visa - Visa.
payment_detail.card_expiry_date
string
Expiration date (month/year) of the card with which the payment was made. The parameter takes value at the time of card payment.

payment_detail.request_account_tag
string
E-commerce POS identifier requested in the order.

payment_detail.transfer_account_tag
string
E-commerce POS identifier on which the payment was processed.

payment_detail.saved_card_type
string
Saved card type. Possible values are listed below:
recurrent - Card saved for client initiated future payments.
subscription - Card saved for automatic, subscription payments with fixed amount and details.
payment_detail.parent_order_id
string
If payment was initiated using saved card, saved card order Id is given.
payment_detail.code
string
Payment Response Code.
payment_detail.code_description
string
Payment Response Code Description.
payment_detail.auth_code
string
Card, Google Pay or Apple Pay Payment Authorization Code.
discount
object
Discount details, that was applied on the payment

discount.bank_discount_amount
string
Bank Discount Amount
discount.bank_discount_desc
string
Bank Discount Description
discount.system_discount_amount
string
Card system discount amount
discount.system_discount_desc
string
Card system discount description
discount.discounted_amount
string
Amount after discount
discount.original_order_amount
string
Original amount
actions
array
The list of actions associated with an order.

actions[].action_id
string
The action identifier.
actions[].request_channel
string
The channel, from which the action was initiated:

public_api - online payments API
business_manager - business manager website
support - BOG inner system.
actions[].action
string
The action type:

authorize - confirmation of pre-authorize payment
partial_authorize - confirmation of pre-authorize payment
cancel_authorize - rejection of pre-authorize payment
refund - refund
partial_refund - partially refund
actions[].status
string
The action status:

completed - action has been completed successfully
rejected - has been completed unsuccessfully
actions[].zoned_action_date
string
The date when the action was initiated in Coordinated Universal Time (UTC). It follows the format "YYYY-MM-DDTHH:MM:SS.ssssssZ".
actions[].amount
string
The amount associated with the action.
lang
string
The interface language found by a customer after re-directing to the online payment page. There are two meanings:

ka - Kartuli (Georgian)
en - English
reject_reason
string
The reason for payment failure. The parameter takes value only if the order failed ("order_status": "rejected"). takes the following values:

expiration - the order has expired
unknown - an unidentified reason.
Payment Response Code Description - Payment rejection reason, initiated by card, Google Pay or Apple Pay. See full list of Response codes here.
RESPONSE
{
"order_id": "a767a276-cddd-43ec-9db3-9f9b39eee02d",
"industry": "ecommerce",
"capture": "manual",
"external_order_id": "123456",
"client": {
"id": "10000",
"brand_ka": "საქართველოს ბანკი",
"brand_en": "BOG",
"url": "https://api.bog.ge"
},
"zoned_create_date": "2022-11-01T13:19:43.021178Z",
"zoned_expire_date": "2022-11-01T13:39:43.021178Z",
"order_status": {
"key": "refunded",
"value": "დაბრუნებული"
},
"buyer": {
"full_name": "John Doe",
"email": "johndoe@gmail.com",
"phone_number": "+995555000000"
},
"purchase_units": {
"request_amount": "100.5",
"transfer_amount": "0.0",
"refund_amount": "100.5",
"currency_code": "GEL",
"items": [
{
"external_item_id": "id_1",
"description": "product 1",
"quantity": "1",
"unit_price": "25.35",
"unit_discount_price": "0",
"vat": "0",
"vat_percent": "0",
"total_price": "25.35",
"package_code": "A000123",
"tin": null,
"pinfl": null,
"product_discount_id": "BF222R5"
}
]
},
"redirect_links": {
"success": "https://payment.bog.ge/receipt?order_id=a767a276-cddd-43ec-9db3-9f9b39eee02d",
"fail": "https://payment.bog.ge/receipt?order_id=a767a276-cddd-43ec-9db3-9f9b39eee02d"
},
"payment_detail": {
"transfer_method": {
"key": "card",
"value": "ბარათით გადახდა"
},
"code": "100",
"code_description": "Successful payment",
"transaction_id": "230513868679",
"payer_identifier": "548888xxxxxx9893",
"payment_option": "direct_debit",
"card_type": "mc",
"card_expiry_date": "03/24",
"request_account_tag": "1212",
"transfer_account_tag": "gev2",
"saved_card_type": "recurrent",
"parent_order_id": "8d52130d-cb1b-45ea-b048-0f040a44e2a3"
},
"discount": {
"bank_discount_amount": "string",
"bank_discount_desc": "string",
"discounted_amount": "string",
"original_order_amount": "string",
"system_discount_amount": "string",
"system_discount_desc": "string"
},
"actions": [
{
"action_id": "b70968ca-eda9-47ae-8811-26fd1ab733f8",
"request_channel": "public_api",
"action": "authorize",
"status": "completed",
"zoned_action_date": "2022-11-28T13:42:40.668439Z",
"amount": "100.5"
},
{
"action_id": "a89b872a-9700-4025-b3fb-047cbba7a5e6",
"request_channel": "business_manager",
"action": "refund",
"status": "completed",
"zoned_action_date": "2022-11-28T13:58:03.427939Z",
"amount": "100.5"
}
],
"lang": "ka",
"reject_reason": null
}

Callback
Unlike other methods, which are initiated by the business, the callback method is triggered by the payment system. The logic for receiving and processing this callback must be implemented on the business side. This method allows the business to receive real-time updates on the payment status when:

The payment is completed successfully.
The payment is completed unsuccessfully.
The amount is fully or partially returned to the customer.
Payment details are sent to the callback URL, provided when the order was requested, using the POST method. To confirm successful receipt of the callback, the business should return HTTP CODE 200. If callback was not received successfully, business must use the Get Payment Details method to verify the payment status and correctly update the order status in its system.

note
Callback and Redirect URL serve distinct purposes:

Redirect URL - Redirects the customer from the online payment page back to the business’s website after payment, enhancing the user experience. However, it does not guarantee the final payment status, as redirection may fail due to user actions or other circumstances, making it essential to verify payment completion through a server-to-server callback.

Callbacks - Ensure payment status confirmation and the secure delivery of payment information from the online payment system’s server to the business’s server. Unlike Redirect URLs, callbacks are independent of user actions and serve as a reliable source for verifying payment status.
Header
Callback-Signature
optional
string
Signature generated by encrypting callback's request body with a private key using SHA256withRSA algorithm. In order to ensure integrity of callback data, business should verify signature using request body and public key. It is essential to execute this verification before the deserialization of the request body, ensuring that the order of fields remains unchanged.

PUBLIC KEY
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----

Response
event
string
Callback type. The meaning is always order_payment.

zoned_request_time
string
Date of sending a callback in Coordinated Universal Time (UTC). It follows the format "YYYY-MM-DDTHH:MM:SS.ssssssZ".
body
object
Order data. Involves the payment detail containing fields.

RESPONSE
{
"event": "order_payment",
"zoned_request_time": "2022-11-23T18:06:37.240559Z",
"body": {
"order_id": "a767a276-cddd-43ec-9db3-9f9b39eee02d",
"industry": "ecommerce",
...
}
}
