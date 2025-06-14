// SPDX-License-Identifier: MIT
%lang starknet

@contract_interface
trait IERC20 {
    fn name() -> felt252;
    fn symbol() -> felt252;
    fn decimals() -> u8;
    fn totalSupply() -> u256;
    fn balanceOf(account: ContractAddress) -> u256;
    fn transfer(recipient: ContractAddress, amount: u256) -> bool;
    fn allowance(owner: ContractAddress, spender: ContractAddress) -> u256;
    fn approve(spender: ContractAddress, amount: u256) -> bool;
    fn transferFrom(sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
}

@storage_var
def balances(account: ContractAddress) -> u256:
end

@storage_var
def total_supply() -> u256:
end

@constructor
def constructor(initial_supply: u256, recipient: ContractAddress):
    balances.write(recipient, initial_supply)
    total_supply.write(initial_supply)
    return ()
end

@external
fn name() -> felt252:
    return 123456  # Replace with your token name as felt252
end

@external
fn symbol() -> felt252:
    return 654321  # Replace with your token symbol as felt252
end

@external
fn decimals() -> u8:
    return 18
end

@external
fn totalSupply() -> u256:
    return total_supply.read()
end

@external
fn balanceOf(account: ContractAddress) -> u256:
    return balances.read(account)
end

@external
fn transfer(recipient: ContractAddress, amount: u256) -> bool:
    let sender = get_caller_address()
    let sender_balance = balances.read(sender)
    assert sender_balance >= amount, 'Insufficient balance'
    balances.write(sender, sender_balance - amount)
    let recipient_balance = balances.read(recipient)
    balances.write(recipient, recipient_balance + amount)
    return true
end
